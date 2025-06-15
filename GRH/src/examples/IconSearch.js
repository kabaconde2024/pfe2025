import React, { useState } from "react";
import * as Icons from "@mui/icons-material"; // Importez toute la bibliothèque d'icônes
import PropTypes from "prop-types"; // Importer PropTypes

const IconSearch = ({ onSelect }) => {
    const [searchTerm, setSearchTerm] = useState("");

    // Obtenez les noms d'icônes à partir de l'objet Icons
    const iconList = Object.keys(Icons).map((key) => ({
        name: key,
        icon: Icons[key],
    }));

    // Filtrer les icônes en fonction du terme de recherche
    const filteredIcons = iconList.filter((icon) =>
        icon.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div>
            <input
                type="text"
                placeholder="Rechercher une icône..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ marginBottom: "10px", width: "100%", padding: "8px" }}
            />
            <div style={{ display: "flex", flexWrap: "wrap" }}>
                {filteredIcons.map((item) => (
                    <div
                        key={item.name}
                        style={{
                            margin: "10px",
                            cursor: "pointer",
                            textAlign: "center",
                        }}
                        onClick={() => onSelect(item.name)} // Appelle la fonction onSelect avec le nom de l'icône
                    >
                        {/* Rendu de l'icône */}
                        {React.createElement(item.icon, {
                            style: { fontSize: "40px" }, // Taille de l'icône
                        })}
                        <div>{item.name}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// Validation des props
IconSearch.propTypes = {
    onSelect: PropTypes.func.isRequired, // Définit onSelect comme une prop requise
};

export default IconSearch;