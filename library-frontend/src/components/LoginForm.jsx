import { useMutation } from "@apollo/client";
import { useState, useEffect } from "react";
import { LOGIN } from "../queries";

// eslint-disable-next-line react/prop-types
const LoginForm = ({ setToken, show }) => {
  const [username, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [login, result] = useMutation(LOGIN, {
    onError: (e) => {
      alert(e.graphQLErrors[0].message);
      console.log(e.graphQLErrors[0].message);
      
    },
  });

  useEffect(() => {
    if (result.data) {
      const token = result.data.login.value;
      setToken(token);
      localStorage.setItem("library-user-token", token);
    }
  }, [result.data]);

  const handleLogin = async (e) => {
    e.preventDefault();
    login({ variables: { username, password } });
  };

  if (!show) return null

  return (
    <div>
      <form onSubmit={handleLogin}>
        <p>User</p>
        <input
          type='text'
          value={username}
          onChange={(e) => setUser(e.target.value)}
        />
        <br />
        <p>Password</p>
        <input
          type='password'
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <br />
        <button type='submit'>Login</button>
      </form>
    </div>
  );
};
export default LoginForm;
