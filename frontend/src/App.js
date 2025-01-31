import React, { useState, useEffect } from "react";
import axios from "axios";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [editorContent, setEditorContent] = useState("");
  const [view, setView] = useState("upload"); // 'upload' or 'history'

  // Fetch document history
  useEffect(() => {
    if (token) {
      axios
        .get("http://localhost:5000/documents", {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((res) => setDocuments(res.data))
        .catch((err) => console.error(err));
    }
  }, [token]);

  // Handle file upload
  const handleUpload = async () => {
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await axios.post("http://localhost:5000/upload", formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setResult(res.data);
      setEditorContent(res.data.correctedText);
    } catch (err) {
      console.error(err);
    }
  };

  // Handle document download
  const handleDownload = async (id) => {
    try {
      const res = await axios.get(`http://localhost:5000/download/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "corrected_document.txt");
      document.body.appendChild(link);
      link.click();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <h1>Grammar Checker</h1>
      <div>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button onClick={() => axios.post("http://localhost:5000/signup", { email, password }).then(() => alert("User registered."))}>
          Signup
        </button>
        <button onClick={() => axios.post("http://localhost:5000/login", { email, password }).then((res) => setToken(res.data.token))}>
          Login
        </button>
      </div>

      {token && (
        <div>
          <button onClick={() => setView("upload")}>Upload Document</button>
          <button onClick={() => setView("history")}>Document History</button>
        </div>
      )}

      {view === "upload" && token && (
        <div>
          <input type="file" onChange={(e) => setFile(e.target.files[0])} />
          <button onClick={handleUpload}>Upload</button>
          {result && (
            <div>
              <h2>Corrected Text</h2>
              <ReactQuill value={editorContent} onChange={setEditorContent} />
              <h2>Stats</h2>
              <pre>{JSON.stringify(result.stats, null, 2)}</pre>
            </div>
          )}
        </div>
      )}

      {view === "history" && token && (
        <div>
          <h2>Document History</h2>
          <ul>
            {documents.map((doc) => (
              <li key={doc._id}>
                <span>{doc.filename}</span>
                <button onClick={() => handleDownload(doc._id)}>Download</button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default App;