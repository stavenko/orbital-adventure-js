import {TextureLoader} from 'three/src/loaders/TextureLoader'
import {RepeatWrapping} from 'three/src/constants'

export default function(url){
      let texture = new TextureLoader().load(url, ()=>{ });
          texture.wrapS = texture.wrapT = RepeatWrapping;
              return texture;
}

