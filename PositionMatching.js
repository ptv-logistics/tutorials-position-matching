$(document).ready(() => {
  const api_key = "YOUR_API_KEY";
  const styleUrl = "https://vectormaps-resources.myptv.com/styles/latest/standard.json";
  const mapLocation = [8.4055677, 49.0070036];

  maplibregl.setRTLTextPlugin(
    'https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-rtl-text/v0.2.3/mapbox-gl-rtl-text.js',
    null,
    true, // Lazy load the plugin to support right-to-left languages such as Arabic and Hebrew.
  );

  const map = new maplibregl.Map({
    container: 'map',
    zoom: 11,
    pitch: 0,
    minZoom: 2,
    center: mapLocation,
    antialias: true,
    hash: true,
    style: styleUrl,
    transformRequest: (url) => {
      let transformedUrl = url;
      let mapsPathIndex = url.indexOf('/maps/overlays');
      if (mapsPathIndex > 0) {
          transformedUrl = 'https://api.myptv.com' + url.substring(mapsPathIndex) + '&apiKey=' + api_key;
          return {
            url: `${transformedUrl}`
          };
        } 
      mapsPathIndex = url.indexOf('/maps/');
      if (mapsPathIndex > 0) {
        transformedUrl = 'https://api.myptv.com' + url.substring(mapsPathIndex) + '?apiKey=' + api_key;
        return {
          url: `${transformedUrl}`
        };
      } 
      return null;
    }
  });

  map.on('load', (event) => {
    if (map.getLayer('TSP_Low_Emission_Zones')) {
      map.setLayoutProperty('TSP_Low_Emission_Zones', 'visibility', 'visible');
    }
  });

  // Add controls to the map.
  map.addControl(new maplibregl.NavigationControl());

  let mapMarker = undefined; // we keep track of all markers here
  function addMarker(lngLat, textAsHtml) {
    const popup = new maplibregl.Popup({ maxWidth:"600px" })
        .setHTML(textAsHtml);
    const marker = new maplibregl.Marker()
      .setLngLat(lngLat)
      .setPopup(popup)
      .addTo(map);
    mapMarker = marker;
    marker.togglePopup();
  }

  function clearMarker() {
    if (mapMarker) mapMarker.remove();
    mapMarker = undefined;
  }

  function getMapMatchRequest(lngLat) {
    let url = "https://api.myptv.com/mapmatch/v1/positions/";
    url = `${url + lngLat.lat}/${lngLat.lng}`;
    url = `${url}?results=SEGMENT_LOCATION_DESCRIPTORS,LOW_EMISSION_ZONES`;
    return url;
  }

  function getPopupContent(lngLat, result) {
    const coordinate = `<h4>Coordinate: (${normalize(lngLat.lat)}, ${normalize(lngLat.lng)}) --> (${normalize(result.latitude)}, ${normalize(result.longitude)})<h4>`;
    const address = `<h4>Address: ${result.segmentLocationDescriptors.street}, ${result.segmentLocationDescriptors.postalCode} ${result.segmentLocationDescriptors.city}<h4>`;
    const lowEmissionZones = getLowEmissionZones(result.lowEmissionZones);
    return coordinate + address + lowEmissionZones;
  }

  function getLowEmissionZones(lowEmissionZones) {
    let results = '';
    if (!lowEmissionZones) return results;

    lowEmissionZones.forEach((lowEmissionZone) => {
      results +=
        `<h4>${lowEmissionZone.name}</h4>
        <ul>
          <li>Approvals: ${lowEmissionZone.approvals?.join(',') || ''}</li>
          <li>Fuel Types: ${lowEmissionZone.fuelTypes?.join(',') || ''}</li>
          <li>Vehicle Categories: ${lowEmissionZone.vehicleCategories?.join(',') || ''}</li>`;
      results += `<p><b>Vehicle Restrictions:</b>`;
      lowEmissionZone.vehicles.forEach((vehicle) => {
        results +=
          `<ul>
            <li>Vehicle Category: ${vehicle.vehicleCategory}</li>
            <li>Time Restriction: ${vehicle.timeRestrictions}</li>
            <li>Fuel Types: ${vehicle.fuelTypes}</li>
            <li>Emission Standards: ${vehicle.emissionStandards}</li>
            <li>Vehicle Attributes: ${JSON.stringify(vehicle.vehicleAttributes)}</li>
          </ul></p>`;
      });

      results += `</p></ul>`;
    });
    return results;
  }

  function showMapMatchResult(lngLat, result, action) {
    const inputLatitude = normalize(lngLat.lat);
    const inputLongitude = normalize(lngLat.lng);
    if (Object.keys(result).length === 0) {
      action(lngLat, `<h4>(${inputLatitude}, ${inputLongitude}) --> no result</h4>`);
    } else {
      if (result.longitude && result.latitude) {
        const resultLatitude = normalize(result.latitude);
        const resultLongitude = normalize(result.longitude);
        action({ lat: result.latitude, lng: result.longitude },
          getPopupContent(lngLat, result));
      } else {
        action(lngLat, JSON.stringify(result, null, 4));
      }
    }
  }

  function normalize(value) {
    return value.toFixed(6);
  }

  function callPositionMatching(lngLat, action) {
    fetch(
      getMapMatchRequest(lngLat),
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apiKey': api_key
        },
      },
    )
      .then((response) =>
        response.json())
      .then((result) => {
        showMapMatchResult(lngLat, result, action);
      });
  }

  function transformVectorMapsUrl(url) {
    
  }

  map.on('click', (e) => {
    clearMarker();
    callPositionMatching(e.lngLat, (lngLat, result) => {
      addMarker(lngLat, `${result}`);
    });
  });

});
