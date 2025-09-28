import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Modal, Button, Card, Spinner, Alert } from 'react-bootstrap';

function AlbumReview({ albumId }) {
  const [album, setAlbum] = useState(null);
  const [showStrengths, setShowStrengths] = useState(false);
  const [showWeaknesses, setShowWeaknesses] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAlbum = async () => {
      try {
        const res = await axios.get(`http://localhost:3000/api/album/${albumId}`);
        setAlbum(res.data);
      } catch (err) {
        setError('Failed to load album review.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (albumId) {
      fetchAlbum();
    }
  }, [albumId]);

  if (loading) {
    return (
      <div className="text-center">
        <Spinner animation="border" />
        <p>Loading review...</p>
      </div>
    );
  }

  if (error) {
    return <Alert variant="danger">{error}</Alert>;
  }

  if (!album) {
    return <Alert variant="info">Album not found.</Alert>;
  }

  return (
    <Card className="mt-4">
      <Card.Body>
        <Card.Title>{album.title}</Card.Title>
        <Card.Subtitle className="mb-2 text-muted">by {album.artist}</Card.Subtitle>
        <Card.Text>
          Released: {new Date(album.releaseDate).toLocaleDateString()}
        </Card.Text>
        {album.imageUrl && (
          <Card.Img variant="top" src={album.imageUrl} alt={`${album.title} cover`} style={{ maxWidth: '200px' }} />
        )}
        {album.status === 'enqueued' ? (
          <Alert variant="warning">
            <strong>Review enqueued</strong>
            <br />
            Ready by {new Date(album.readyBy).toLocaleDateString()}
          </Alert>
        ) : album.status === 'error' ? (
          <Alert variant="danger">
            {album.message || 'Review unavailable.'}
          </Alert>
        ) : (
          <>
            <div className="text-center mb-3">
              <h2>{album.score}/10</h2>
            </div>
            <div className="d-flex justify-content-center gap-2 mb-3">
              <Button
                variant="success"
                onClick={() => setShowStrengths(true)}
              >
                Strengths ({album.strengths?.length || 0})
              </Button>
              <Button
                variant="danger"
                onClick={() => setShowWeaknesses(true)}
              >
                Weaknesses ({album.weaknesses?.length || 0})
              </Button>
            </div>
          </>
        )}

        {/* Strengths Modal */}
        <Modal show={showStrengths} onHide={() => setShowStrengths(false)} centered>
          <Modal.Header closeButton>
            <Modal.Title>Strengths</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {album.strengths?.length ? (
              <ul>
                {album.strengths.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            ) : (
              <p>No notable strengths.</p>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowStrengths(false)}>
              Close
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Weaknesses Modal */}
        <Modal show={showWeaknesses} onHide={() => setShowWeaknesses(false)} centered>
          <Modal.Header closeButton>
            <Modal.Title>Weaknesses</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {album.weaknesses?.length ? (
              <ul>
                {album.weaknesses.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            ) : (
              <p>No notable weaknesses.</p>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowWeaknesses(false)}>
              Close
            </Button>
          </Modal.Footer>
        </Modal>
      </Card.Body>
    </Card>
  );
}

export default AlbumReview;
