import React, { useState } from "react";
import axios from "axios";

function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);

  const handleSignup = async () => {
    await axios.post("http://localhost:5000/signup", { email, password });
    alert("User registered.");
  };

  const handleLogin = async () => {
    const res = await axios.post("http://localhost:5000/login", { email, password });
    setToken(res.data.token);
    alert("Logged in.");
  };

  const handleUpload = async () => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await axios.post("http://localhost:5000/upload", formData, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setResult(res.data);
  };

  return (
    <div>
      <h1>Grammar Checker</h1>
      <div>
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button onClick={handleSignup}>Signup</button>
        <button onClick={handleLogin}>Login</button>
      </div>
      <div>
        <input type="file" onChange={(e) => setFile(e.target.files[0])} />
        <button onClick={handleUpload}>Upload</button>
      </div>
      {result && (
        <div>
          <h2>Corrected Text</h2>
          <pre>{result.correctedText}</pre>
          <h2>Stats</h2>
          <pre>{JSON.stringify(result.stats, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

export default App;