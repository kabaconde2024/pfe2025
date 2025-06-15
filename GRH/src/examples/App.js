import React, { useState, useEffect } from 'react';
import axios from 'axios';

const App = () => {
    const [message, setMessage] = useState('');

    useEffect(() => {
        axios.get('http://localhost:5000/')
            .then(response => {
                setMessage(response.data);
            })
            .catch(error => {
                console.error("Erreur lors de la récupération des données:", error);
            });
    }, []);

    return (
        <div>
            <h1>Communication Frontend - Backend</h1>
            <p>{message}</p>
        </div>
    );
};

export default App;
