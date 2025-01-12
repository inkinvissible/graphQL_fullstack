const { ApolloServer } = require("@apollo/server");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const { PubSub } = require('graphql-subscriptions');
const cors = require('cors');
const bodyParser = require('body-parser');
const { expressMiddleware } = require("@apollo/server/express4");
const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const { useServer } = require('graphql-ws/lib/use/ws');
const { makeExecutableSchema } = require('@graphql-tools/schema');
const Author = require("./models/author");
const Book = require("./models/book");
const User = require("./models/user");
const { GraphQLError } = require("graphql");
const DataLoader = require('dataloader');


const pubsub = new PubSub();

require("dotenv").config();

const MONGODB_URI = process.env.MONGODB_URI;

console.log("connecting to", MONGODB_URI);

const createBookCountLoader = () => new DataLoader(async (authorIds) => {
  const counts = await Book.aggregate([
    { $match: { author: { $in: authorIds } } },
    { $group: { _id: "$author", count: { $sum: 1 } } },
  ]);

  const countMap = {};
  counts.forEach(c => {
    countMap[c._id.toString()] = c.count;
  });

  return authorIds.map(id => countMap[id.toString()] || 0);
});

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("connected to MongoDB");
  })
  .catch((error) => {
    console.log("error connection to MongoDB:", error.message);
  });

const typeDefs = `
  type Mutation {
    addBook (
      title: String!
      published: Int!
      author: String!
      genres: [String!]!
    ) : Book

    editAuthor(
      name: String!
      setBornTo: Int
    ) : Author

    createUser(
      username: String!
      favoriteGenre: String!
    ): User

    login(
      username: String!
      password: String!
    ): Token
  }

  type User {
    username: String!
    favoriteGenre: String!
    id: ID!
  }

  type Token {
    value: String!
  }

  type Book {
    id: ID!
    title: String!
    published: Int!
    author: Author!
    genres: [String!]!
  }

  type Author {
    name: String!
    id: ID!
    born: Int
    bookCount: Int!
  }

  type Subscription {
    bookAdded: Book!
  }

  type Query {
    authorCount: Int!
    bookCount: Int!
    allBooks(author: String, genre: String): [Book!]!
    allAuthors: [Author!]!
    me: User
  }
`;

const resolvers = {
  Query: {
    authorCount: async () => await Author.countDocuments(),
    bookCount: async () => await Book.countDocuments(),
    allBooks: async (_root, args) => {
      let query = {};
      if (args.author) {
        const author = await Author.findOne({ name: args.author });
        if (author) {
          query.author = author._id;
        }
      }
      if (args.genre) {
        query.genres = args.genre;
      }
      return Book.find(query).populate("author");
    },
    me: (_root, _args, context) => {
      return context.currentUser;
    },
    allAuthors: async () => {
      return await Author.find({});
    },
  },
  Author: {
    bookCount: async (root, _args, context) => {
      return context.bookCountLoader.load(root._id);
    },
  },
  Mutation: {
    addBook: async (_root, args, context) => {
      const currentUser = context.currentUser;

      if (!currentUser) {
        throw new GraphQLError("not authenticated", {
          extensions: {
            code: "NOT_AUTHORIZED",
          },
        });
      }
      let author = await Author.findOne({ name: args.author });
      if (!author) {
        const newAuthor = new Author({ name: args.author });
        try {
          author = await newAuthor.save();
        } catch (e) {
          throw new GraphQLError("Incorrect user input", {
            extensions: { code: "BAD_USER_INPUT" },
          });
        }
      }
      const book = new Book({ ...args, author: author._id });
      try {
        const savedBook = await book.save();
        const populatedBook = await savedBook.populate('author');
        console.log('Publicando BOOK_ADDED:', populatedBook);
        pubsub.publish('BOOK_ADDED', { bookAdded: populatedBook });
        return savedBook;
      } catch (e) {
        console.error('Error al guardar el libro:', e);
        throw new GraphQLError("Incorrect user input", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }
    },
    editAuthor: async (_root, args, context) => {
      const currentUser = context.currentUser;

      if (!currentUser) {
        throw new GraphQLError("not authenticated", {
          extensions: {
            code: "BAD_USER_INPUT",
          },
        });
      }
      const authorName = args.name;
      const bornDate = args.setBornTo;

      const authorToUpdate = await Author.findOne({ name: authorName });
      if (!authorToUpdate) return null;
      const authorUpdated = { ...authorToUpdate.toObject(), born: bornDate };
      const response = await Author.findByIdAndUpdate(
        authorToUpdate._id,
        authorUpdated,
        { new: true }
      );
      return response;
    },
    createUser: async (_root, args) => {
      const user = new User({
        username: args.username,
        favoriteGenre: args.favoriteGenre,
      });

      return user.save().catch((e) => {
        throw new GraphQLError("Creating the user failed", {
          extensions: {
            code: "BAD_USER_INPUT",
            invalidArgs: args.name,
            e,
          },
        });
      });
    },
    login: async (_root, args) => {
      const user = await User.findOne({ username: args.username });
      if (!user || args.password !== "secret") {
        throw new GraphQLError("wrong credentials", {
          extensions: {
            code: "BAD_USER_INPUT",
          },
        });
      }

      const userForToken = {
        username: user.username,
        id: user._id,
      };

      return { value: jwt.sign(userForToken, process.env.SECRET) };
    },
  },
  Subscription: {
    bookAdded: {
      subscribe: (parent, args, context) => {
        console.log('Suscripción a BOOK_ADDED iniciada');
        return pubsub.asyncIterableIterator(['BOOK_ADDED'])
        
      }
    }
  }
};

// Create executable schema
const schema = makeExecutableSchema({ typeDefs, resolvers });

const server = new ApolloServer({
  schema,
});

async function startServer() {
  await server.start();

  const app = express();
  app.use(cors());
  app.use(bodyParser.json());

  app.use(
    '/graphql',
    expressMiddleware(server, {
      context: async ({ req }) => {
        const auth = req.headers.authorization || '';
        if (auth.startsWith("Bearer ")) {
          try {
            const decodedToken = jwt.verify(auth.substring(7), process.env.SECRET);
            const currentUser = await User.findById(decodedToken.id).populate("favoriteGenre");
            return { currentUser, pubsub };
          } catch (error) {
            throw new GraphQLError("Invalid or expired token", {
              extensions: {
                code: "UNAUTHENTICATED",
              },
            });
          }
        }
        return { pubsub, bookCountLoader: createBookCountLoader()};
      },
    }),
  );

  const httpServer = http.createServer(app);

  // Set up WebSocket server
  const wsServer = new WebSocketServer({
    server: httpServer,
    path: '/graphql',
  });

  // Integrate graphql-ws with the WebSocket server
  useServer({
    schema,
    context: async (ctx, msg, args) => {
      const auth = ctx.connectionParams.authorization || '';
      if (auth.startsWith("Bearer ")) {
        try {
          const decodedToken = jwt.verify(auth.substring(7), process.env.SECRET);
          const currentUser = await User.findById(decodedToken.id).populate("favoriteGenre");
          return { currentUser, pubsub };
        } catch (error) {
          console.error('Error en contexto de WebSocket:', error);
          throw new GraphQLError("Invalid or expired token", {
            extensions: { code: "UNAUTHENTICATED" },
          });
        }
      }
      return { pubsub };
    },
  }, wsServer);

  httpServer.listen(4000, () => {
    console.log(`Server ready at http://localhost:4000/graphql`);
    console.log(`Subscriptions ready at ws://localhost:4000/graphql`);
  });
}

startServer();