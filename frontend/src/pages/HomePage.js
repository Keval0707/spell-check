import React, { useState } from "react";
import { TextField, Button, Select, MenuItem, Box, Typography } from "@mui/material";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import axios from "axios";

const HomePage = ({ token }) => {
  const [file, setFile] = useState(null);
  const [language, setLanguage] = useState("en-US");
  const [result, setResult] = useState(null);
  const [editorContent, setEditorContent] = useState("");

  const handleUpload = async () => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("language", language);
    try {
      const res = await axios.post("http://localhost:5000/api/documents/upload", formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setResult(res.data);
      setEditorContent(res.data.correctedText);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Box>
      <input type="file" onChange={(e) => setFile(e.target.files[0])} />
      <Select value={language} onChange={(e) => setLanguage(e.target.value)} sx={{ ml: 2 }}>
        <MenuItem value="en-US">English (US)</MenuItem>
        <MenuItem value="fr">French</MenuItem>
        <MenuItem value="es">Spanish</MenuItem>
        <MenuItem value="de">German</MenuItem>
      </Select>
      <Button variant="contained" onClick={handleUpload} sx={{ ml: 2 }}>
        Upload
      </Button>
      {result && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6">Corrected Text</Typography>
          <ReactQuill value={editorContent} onChange={setEditorContent} />
          <Typography variant="h6" sx={{ mt: 2 }}>Stats</Typography>
          <pre>{JSON.stringify(result.stats, null, 2)}</pre>
        </Box>
      )}
    </Box>
  );
};

export default HomePage;