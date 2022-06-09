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
      let mapsPathIndex = url.indexOf('/maps/');
  
      if (mapsPathIndex > 0) {
        transformedUrl = 'https://api.myptv.com/' + url.substring(mapsPathIndex) + '?apiKey=' + api_key;
        return {
          url: `${transformedUrl}`
        };
      } 
      return null;
    }
  });

  // Add controls to the map.
  map.addControl(new maplibregl.NavigationControl());

  let mapMarker = undefined; // we keep track of all markers here
  function addMarker(lngLat, textAsHtml) {
    const popup = new maplibregl.Popup({closeButton: false})
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
    url = `${url}?results=SEGMENT_LOCATION_DESCRIPTORS`;
    return url;
  }

  function showMapMatchResult(lngLat, result, action) {
    const inputLatitude = normalize(lngLat.lat);
    const inputLongitude = normalize(lngLat.lng);
    if (Object.keys(result).length === 0) {
      action(lngLat, `(${inputLatitude}, ${inputLongitude}) --> <br> no result`);
    } else {
      if (result.longitude && result.latitude) {
        const resultLatitude = normalize(result.latitude);
        const resultLongitude = normalize(result.longitude);
        action({ lat: result.latitude, lng: result.longitude },
          `(${inputLatitude}, ${inputLongitude}) --> <br> (${resultLatitude}, ${resultLongitude}) : <br>` +
          `${result.segmentLocationDescriptors.street} (${result.segmentLocationDescriptors.city})`);
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
