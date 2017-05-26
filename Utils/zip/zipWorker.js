import pako from 'pako';

addEventListener('message', event=>{
  let {key, array, type, textureType} = event.data;
  let newArray = pako.inflate(array).buffer;
  delete event.data.array;

  self.postMessage({texture: newArray, ...event.data}, [newArray]);

});
