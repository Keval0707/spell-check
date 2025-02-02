import React, { useEffect, useState } from "react";
import { List, ListItem, ListItemText, Button, Box, Typography } from "@mui/material";
import axios from "axios";

const SharedPage = ({ token }) => {
  const [sharedDocuments, setSharedDocuments] = useState([]);

  useEffect(() => {
    axios
      .get("http://localhost:5000/api/documents/shared-documents", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setSharedDocuments(res.data))
      .catch((err) => console.error(err));
  }, [token]);

  const handleDownload = async (id) => {
    try {
      const res = await axios.get(`http://localhost:5000/api/documents/download/${id}`, {
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
    <Box>
      <Typography variant="h6">Shared Documents</Typography>
      <List>
        {sharedDocuments.map((doc) => (
          <ListItem key={doc._id}>
            <ListItemText primary={doc.filename} />
            <Button variant="contained" onClick={() => handleDownload(doc._id)}>
              Download
            </Button>
          </ListItem>
        ))}
      </List>
    </Box>
  );
};

export default SharedPage;