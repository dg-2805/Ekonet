import pandas as pd
import json
import os
from collections import Counter

def generate_advanced_map(clustered_df, output_path="reports/figures/wildlife_clustering_map.html"):
    """Generate an advanced interactive map matching the target design"""
    
    # State coordinates mapping
    state_coords = {
        'Karnataka': [15.3173, 75.7139],
        'Kerala': [10.8505, 76.2711],
        'Madhya Pradesh': [22.9734, 78.6569],
        'Maharashtra': [19.7515, 75.7139],
        'Odisha': [20.9517, 85.0985],
        'Rajasthan': [27.0238, 74.2179],
        'Tamil Nadu': [11.1271, 78.6569],
        'Uttar Pradesh': [26.8467, 80.9462],
        'West Bengal': [22.9868, 87.8550]
    }
    
    # Function to decode one-hot encoded features (improved)
    def decode_onehot(row, prefix):
        cols = [col for col in row.index if col.startswith(f'{prefix}_')]
        for col in cols:
            if row[col] == 1.0:
                return col.replace(f'{prefix}_', '')
        # If no one-hot column found, check if original column exists
        if prefix in row.index:
            return str(row[prefix])
        return 'Unknown'
    
    # Debug: Print available columns
    print("Available columns in clustered_df:", clustered_df.columns.tolist())
    print("Sample row data:", clustered_df.iloc[0].to_dict())
    
    # Prepare data for visualization
    map_data = []
    cluster_analysis = {}
    
    for idx, row in clustered_df.iterrows():
        state_name = decode_onehot(row, 'State')
        animal_name = decode_onehot(row, 'Animal')
        incident_name = decode_onehot(row, 'Incident')
        cluster = int(row['Cluster'])
        
        # Debug first few rows
        if idx < 3:
            print(f"Row {idx}: State={state_name}, Animal={animal_name}, Incident={incident_name}, Cluster={cluster}")
        
        if state_name in state_coords:
            lat, lon = state_coords[state_name]
            
            map_data.append({
                'lat': lat,
                'lng': lon,
                'state': state_name,
                'animal': animal_name,
                'incident': incident_name,
                'cluster': cluster
            })
            
            # Build cluster analysis
            if cluster not in cluster_analysis:
                cluster_analysis[cluster] = {
                    'animals': Counter(),
                    'incidents': Counter(),
                    'total_count': 0
                }
            
            cluster_analysis[cluster]['animals'][animal_name] += 1
            cluster_analysis[cluster]['incidents'][incident_name] += 1
            cluster_analysis[cluster]['total_count'] += 1
    
    # Get unique values for filters
    all_animals = list(set([item['animal'] for item in map_data]))
    all_incidents = list(set([item['incident'] for item in map_data]))
    
    # Generate cluster descriptions
    cluster_descriptions = {}
    for cluster_id, data in cluster_analysis.items():
        top_animal = data['animals'].most_common(1)[0] if data['animals'] else ('Unknown', 0)
        top_incident = data['incidents'].most_common(1)[0] if data['incidents'] else ('Unknown', 0)
        
        cluster_descriptions[cluster_id] = {
            'primary_animal': top_animal[0],
            'primary_incident': top_incident[0],
            'total_incidents': data['total_count'],
            'description': f"{top_animal[0]} - {top_incident[0]}"
        }
    
    # Generate HTML
    html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <title>Wildlife Incident Clusters</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.css" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.Default.css" />
    <style>
        body {{
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
        }}
        #map {{
            height: 100vh;
            width: 100%;
        }}
        .filter-panel {{
            position: absolute;
            top: 10px;
            left: 10px;
            background: white;
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            z-index: 1000;
            min-width: 200px;
        }}
        .cluster-panel {{
            position: absolute;
            bottom: 10px;
            left: 10px;
            background: white;
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            z-index: 1000;
            max-width: 250px;
            max-height: 300px;
            overflow-y: auto;
        }}
        .filter-group {{
            margin-bottom: 10px;
        }}
        .filter-group label {{
            display: block;
            font-weight: bold;
            margin-bottom: 5px;
        }}
        .filter-group select {{
            width: 100%;
            padding: 5px;
            border: 1px solid #ccc;
            border-radius: 4px;
        }}
        .filter-buttons {{
            margin-top: 15px;
        }}
        .btn {{
            padding: 8px 15px;
            margin: 2px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
        }}
        .btn-primary {{
            background-color: #007bff;
            color: white;
        }}
        .btn-secondary {{
            background-color: #6c757d;
            color: white;
        }}
        .cluster-item {{
            margin-bottom: 8px;
            padding: 5px;
            border-left: 4px solid;
            font-size: 12px;
        }}
        .cluster-0 {{ border-color: #e74c3c; }}
        .cluster-1 {{ border-color: #3498db; }}
        .cluster-2 {{ border-color: #27ae60; }}
        .cluster-3 {{ border-color: #9b59b6; }}
        .cluster-4 {{ border-color: #e67e22; }}
        .panel-title {{
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 10px;
            border-bottom: 1px solid #eee;
            padding-bottom: 5px;
        }}
        .map-controls {{
            position: absolute;
            top: 10px;
            right: 10px;
            z-index: 1000;
        }}
        .control-item {{
            background: white;
            margin: 5px 0;
            padding: 8px;
            border-radius: 4px;
            box-shadow: 0 1px 5px rgba(0,0,0,0.3);
        }}
        .cluster-marker {{
            background: none !important;
            border: none !important;
        }}
        .cluster-marker div {{
            transition: all 0.3s ease;
            cursor: pointer;
        }}
        .cluster-marker:hover div {{
            transform: scale(1.15);
            box-shadow: 0 4px 12px rgba(0,0,0,0.5) !important;
        }}
    </style>
</head>
<body>
    <div id="map"></div>
    
    <!-- Filter Panel -->
    <div class="filter-panel">
        <div class="panel-title">🔍 Filter Data</div>
        <div class="filter-group">
            <label for="animal-filter">Animal:</label>
            <select id="animal-filter">
                <option value="">All Animals</option>
                {chr(10).join([f'<option value="{animal}">{animal}</option>' for animal in sorted(all_animals)])}
            </select>
        </div>
        <div class="filter-group">
            <label for="incident-filter">Incident:</label>
            <select id="incident-filter">
                <option value="">All Incidents</option>
                {chr(10).join([f'<option value="{incident}">{incident}</option>' for incident in sorted(all_incidents)])}
            </select>
        </div>
        <div class="filter-buttons">
            <button class="btn btn-primary" onclick="applyFilters()">Apply Filters</button>
            <button class="btn btn-secondary" onclick="resetFilters()">Reset All</button>
        </div>
    </div>
    
    <!-- Cluster Analysis Panel -->
    <div class="cluster-panel">
        <div class="panel-title">📊 Wildlife Incident Clusters</div>
        <div class="panel-title" style="font-size: 12px; margin-top: 10px;">📈 Cluster Analysis:</div>
        {chr(10).join([f'''
        <div class="cluster-item cluster-{cluster_id}">
            <strong>● Cluster {cluster_id}:</strong> {data["description"]}<br>
            <small>({data["total_incidents"]} incidents)</small>
        </div>''' for cluster_id, data in cluster_descriptions.items()])}
        
        <div class="panel-title" style="font-size: 12px; margin-top: 15px;">🔘 Circle Size Guide:</div>
        <div style="font-size: 11px;">
            <div>● Few incidents</div>
            <div>● Many incidents</div>
        </div>
    </div>
    
    <!-- Map Controls -->
    <div class="map-controls">
        <div class="control-item">
            <label>
                <input type="checkbox" id="clusters-toggle" checked> Clusters
            </label>
        </div>
        <div class="control-item">
            <label>
                <input type="checkbox" id="heatmap-toggle"> Heatmap
            </label>
        </div>
    </div>

    <script src="https://unpkg.com/leaflet@1.7.1/dist/leaflet.js"></script>
    <script src="https://unpkg.com/leaflet.markercluster@1.4.1/dist/leaflet.markercluster.js"></script>
    <script src="https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js"></script>
    
    <script>
        // Initialize map
        const map = L.map('map').setView([20.5937, 78.9629], 5);
        
        // Add tile layer
        L.tileLayer('https://{{s}}.tile.openstreetmap.org/{{z}}/{{x}}/{{y}}.png', {{
            attribution: '© OpenStreetMap contributors'
        }}).addTo(map);
        
        // Data
        const allData = {json.dumps(map_data, indent=2)};
        let filteredData = [...allData];
        
        // Cluster colors - improved palette for better visibility and contrast
        const clusterColors = {{
            0: '#e74c3c',  // Red - good contrast with white text
            1: '#3498db',  // Blue - good contrast with white text  
            2: '#27ae60',  // Green - darker than before for better text contrast
            3: '#9b59b6',  // Purple - good contrast with white text
            4: '#e67e22'   // Orange - darker than original yellow for better readability
        }};
        
        // Layer groups
        let markersGroup = L.markerClusterGroup();
        let heatmapLayer = null;
        
        function createMarkers(data) {{
            markersGroup.clearLayers();
            
            data.forEach(function(point) {{
                const color = clusterColors[point.cluster] || '#95a5a6';
                // Fixed consistent size - 32px for all clusters for better uniformity
                const size = 32;
                
                // Determine text color based on background brightness for better contrast
                const getTextColor = (bgColor) => {{
                    // Convert hex to RGB
                    const hex = bgColor.replace('#', '');
                    const r = parseInt(hex.substr(0, 2), 16);
                    const g = parseInt(hex.substr(2, 2), 16);
                    const b = parseInt(hex.substr(4, 2), 16);
                    
                    // Calculate brightness using luminance formula
                    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
                    
                    // Return black text for light colors, white for dark colors
                    return brightness > 128 ? '#000000' : '#ffffff';
                }};
                
                const textColor = getTextColor(color);
                
                // Create a custom div icon with cluster number
                const markerIcon = L.divIcon({{
                    className: 'cluster-marker',
                    html: `<div style="
                        background-color: ${{color}};
                        color: ${{textColor}};
                        border: 3px solid #ffffff;
                        border-radius: 50%;
                        width: ${{size}}px;
                        height: ${{size}}px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-weight: bold;
                        font-size: 14px;
                        font-family: 'Arial', sans-serif;
                        box-shadow: 0 3px 8px rgba(0,0,0,0.4);
                        text-shadow: ${{textColor === '#ffffff' ? '1px 1px 2px rgba(0,0,0,0.5)' : '1px 1px 2px rgba(255,255,255,0.5)'}};
                    ">${{point.cluster}}</div>`,
                    iconSize: [size, size],
                    iconAnchor: [size/2, size/2]
                }});
                
                const marker = L.marker([point.lat, point.lng], {{
                    icon: markerIcon
                }});
                
                marker.bindPopup(`
                    <strong>Cluster:</strong> ${{point.cluster}}<br>
                    <strong>State:</strong> ${{point.state}}<br>
                    <strong>Animal:</strong> ${{point.animal}}<br>
                    <strong>Incident:</strong> ${{point.incident}}
                `);
                
                markersGroup.addLayer(marker);
            }});
            
            if (document.getElementById('clusters-toggle').checked) {{
                map.addLayer(markersGroup);
            }}
        }}
        
        function createHeatmap(data) {{
            if (heatmapLayer) {{
                map.removeLayer(heatmapLayer);
            }}
            
            const heatData = data.map(point => [point.lat, point.lng, 1]);
            heatmapLayer = L.heatLayer(heatData, {{radius: 25}});
            
            if (document.getElementById('heatmap-toggle').checked) {{
                map.addLayer(heatmapLayer);
            }}
        }}
        
        function applyFilters() {{
            const animalFilter = document.getElementById('animal-filter').value;
            const incidentFilter = document.getElementById('incident-filter').value;
            
            filteredData = allData.filter(point => {{
                return (!animalFilter || point.animal === animalFilter) &&
                       (!incidentFilter || point.incident === incidentFilter);
            }});
            
            updateMap();
        }}
        
        function resetFilters() {{
            document.getElementById('animal-filter').value = '';
            document.getElementById('incident-filter').value = '';
            filteredData = [...allData];
            updateMap();
        }}
        
        function updateMap() {{
            createMarkers(filteredData);
            createHeatmap(filteredData);
        }}
        
        // Toggle controls
        document.getElementById('clusters-toggle').addEventListener('change', function() {{
            if (this.checked) {{
                map.addLayer(markersGroup);
            }} else {{
                map.removeLayer(markersGroup);
            }}
        }});
        
        document.getElementById('heatmap-toggle').addEventListener('change', function() {{
            if (this.checked && heatmapLayer) {{
                map.addLayer(heatmapLayer);
            }} else if (heatmapLayer) {{
                map.removeLayer(heatmapLayer);
            }}
        }});
        
        // Initialize
        updateMap();
    </script>
</body>
</html>"""
    
    # Ensure output directory exists
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    # Write HTML file
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(html_content)
    
    print(f"✅ Advanced map created: {output_path}")
    return output_path
