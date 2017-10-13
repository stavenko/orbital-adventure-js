import pako from 'pako';

addEventListener('message', event => {
  const {key, array, type, textureType} = event.data;
  const newArray = pako.inflate(array).buffer;
  delete event.data.array;

  self.postMessage({texture: newArray, ...event.data}, [newArray]);

});
