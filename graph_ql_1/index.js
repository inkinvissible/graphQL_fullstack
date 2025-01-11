const { ApolloServer } = require("@apollo/server");
const { startStandaloneServer } = require("@apollo/server/standalone");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

mongoose.set("strictQuery", false);
const Author = require("./models/author");
const Book = require("./models/book");
const User = require("./models/user");
const { GraphQLError } = require("graphql");

require("dotenv").config();

const MONGODB_URI = process.env.MONGODB_URI;

console.log("connecting to", MONGODB_URI);

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
    bookCount: async (root) => {
      return await Book.countDocuments({ author: root._id });
    },
  },
  Mutation: {
    addBook: async (_root, args) => {
      const currentUser = context.currentUser;

      if (!currentUser) {
        throw new GraphQLError("not authenticated", {
          extensions: {
            code: "BAD_USER_INPUT",
          },
        });
      }
      let author = await Author.findOne({ name: args.author });
      const book = new Book(args);
      if (author) {
        try {
          const response = await book.save();
        } catch (e) {
          throw new GraphQLError("Incorrect user input", {
            extensions: { code: "BAD_USER_INPUT" },
          });
        }
        return response;
      } else {
        const newAuthor = new Author({ name: args.author });
        try {
          const result = await newAuthor.save();
          const response = await book.save();
        } catch (e) {
          throw new GraphQLError("Incorrect user input", {
            extensions: { code: "BAD_USER_INPUT" },
          });
        }
        return response;
      }
    },
    editAuthor: async (_root, args) => {
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
        authorUpdated
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
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

startStandaloneServer(server, {
  listen: { port: 4000 },
  context: async ({ req, res }) => {
    const auth = req ? req.headers.authorization : null;
    if (auth && auth.startsWith("Bearer ")) {
      const decodedToken = jwt.verify(auth.substring(7), process.env.SECRET);
      const currentUser = await User.findById(decodedToken.id).populate(
        "favoriteGenre"
      );
      return { currentUser };
    }
  },
}).then(({ url }) => {
  console.log(`Server ready at ${url}`);
});
