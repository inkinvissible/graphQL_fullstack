import { useMutation } from "@apollo/client";
import { ALL_AUTHORS, EDIT_BORN } from "../queries";
import { useState } from "react";

// eslint-disable-next-line react/prop-types
const AuthorForm = ({ authors }) => {
  const [name, setName] = useState(authors[0]);
  const [born, setBorn] = useState("");
  const [changeBorn] = useMutation(EDIT_BORN);

  const handleSubmit = (e) => {
    e.preventDefault();
    changeBorn({
      variables: { name, setBornTo: Number(born) },
      refetchQueries: [{ query: ALL_AUTHORS }],
    });
    setBorn("");
    setName("");
  };

  return (
    <div>
      <h2>Add Born Date</h2>
      <form onSubmit={handleSubmit}>
        <p>Name</p>
        <select value={name} onChange={(e) => setName(e.target.value)}>
            {/* eslint-disable-next-line react/prop-types */}
            {authors.map(a => <option value={a.name} key={a.name}>{a.name}</option>)}
          
        </select>
        <br />
        <p>Born Date</p>
        <input
          type='text'
          value={born}
          onChange={(e) => setBorn(e.target.value)}
        />
        <button type='submit'>Add</button>
      </form>
    </div>
  );
};

export default AuthorForm;
