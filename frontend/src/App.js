import React, { useState } from 'react';
import AlbumReview from './components/AlbumReview';
import FeaturedAlbums from './components/FeaturedAlbums';
import { Container, Row, Col, Form, Button, Alert } from 'react-bootstrap';
import axios from 'axios';

function App() {
  const [albumId, setAlbumId] = useState('');
  const [currentAlbum, setCurrentAlbum] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!albumId.trim()) return;

    setLoading(true);
    setError('');
    try {
      const res = await axios.post('http://localhost:3000/api/album', { albumId: albumId.trim() });
      setCurrentAlbum(res.data);
    } catch (err) {
      setError('Failed to add album. Please check the Spotify Album ID.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="mt-5">
      <Row>
        <Col>
          <h1 className="text-center mb-4">MusicRx Album Reviewer</h1>
          <FeaturedAlbums />
          <hr />
          <h3 className="text-center mb-4">Add Album Manually</h3>
          <Form onSubmit={handleSearch} className="mb-4">
            <Form.Group controlId="albumId">
              <Form.Label>Spotify Album ID</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter Spotify Album ID (e.g., 4aawyAB9vmqN3uQ7FjRGTy)"
                value={albumId}
                onChange={(e) => setAlbumId(e.target.value)}
                required
              />
            </Form.Group>
            <Button variant="primary" type="submit" disabled={loading} className="mt-2">
              {loading ? 'Adding...' : 'Add Album for Review'}
            </Button>
          </Form>
          {error && <Alert variant="danger">{error}</Alert>}
          {currentAlbum && <AlbumReview albumId={currentAlbum.albumId} />}
        </Col>
      </Row>
    </Container>
  );
}

export default App;
