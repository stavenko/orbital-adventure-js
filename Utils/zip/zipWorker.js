import pako from 'pako';

addEventListener('message', event=>{
  let {key, array, type} = event.data;
  let newArray = pako.inflate(array).buffer;

  self.postMessage({texture: newArray, key}, [newArray]);

});