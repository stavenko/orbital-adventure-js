export class PlanetTextureManager{
  constructor(){
    this.texturesIndex = {
      back: [],
      left: [],
      front: [],
      right: [],
      top: [],
      bottom: []
    }

    this.faceIx={
      back:0, left:1, front:2, right:3,
      top:4, bottom:5
    }
    this.faceColors = [
      [1.0, 0, 0],
      [0, 1, 0 ],
      [1.0, 0.7, 0.7],
      [0.7, 1, 0.7 ],
      [0., 0., 1.0 ],
      [0.7, 0.7, 1.0 ],

    ]

    this.textures = [];
  }

  stToGeo(s,t,face){
    let normal = this.stToNormal(s,t, face);

    /*
    let theta = Math.atan2(normal[1], normal[0]);
    let r = Math.hypot(normal[0], normal[1]);
    let phi = Math.atan2(normal[2], r);
    */

    let [x,y,z] = normal;

    let theta = Math.atan2(y, x);
    let r = Math.hypot(x, y);
    let phi = Math.atan2(z, r);

    return [theta, phi];
  }

  initialize(radius, division=8, lod = 0){
    let zc = 0;
    let {texturesIndex} = this;
    let res = 16;
    for(let ix in texturesIndex){
      let zcolor = zc++ / 6;
      let textures = texturesIndex[ix];
      for(let i =0; i < division; ++i){
        for(let j=0; j < division; ++j){
          let s = i / division;
          let t = j / division;
          let color = this.faceColors[this.faceIx[ix]];
          let ab = new Uint8Array(res*res*4);
          
          for(let ii = 0; ii < res; ++ii){
            for(let jj = 0; jj < res; ++jj){
              let ix = (ii*res+jj)*4;
              ab[ix ] = color[0]*255;
              ab[ix+1] = color[1]*255;
              ab[ix+2] = color[2]*255;
              ab[ix+3] = 255;
            }
          }
          let tix = this.textures.push(ab)-1;
          let geoBounds = [[0,0], [0,1], [1,0], [1,1]]
            .map(x=>x.map((n,i)=>n/division+[s,t][i]))
            .map(st=>this.stToGeo(...st, ix))
            ;
          textures.push({t,s, division, face:this.faceIx[ix] ,geoBounds, tix, lod, resolution:res });

          // debugger;
          // debugger;
        }
      }
    }
  }
  


  stupid(){
    let imgSize = 8*4;
    let edge = imgSize / 4;
    let CF;
    let IX = {};
    this.IX = IX;
    for(let i =0 ;i< imgSize; ++i){
      let face = Math.floor(i/edge);
      let from = edge;
      let to = edge * 2;
      if(face == 2) {
        from = 0; to = edge*3;
      }
      for(let j = from; j < to; ++j){
        let f = face;
        if(j < edge) f= 4;
        if(j >= edge*2) f= 5;
        if(CF !== f) {
          CF = f;
        }

        let n = outImgToXYZ(i,j,f,edge);
        if(!IX[f]) IX[f] = [];
        let s = (i%edge)/edge;
        let t = (j%edge)/edge;
        IX[f].push({s,t,n});

      }
    }

    function outImgToXYZ(i,j,face,edge){
      let a = 2.0 * i / edge;
      let b = 2.0 * j / edge;
      //if(face == 4)
      //debugger;
      switch(face){
        case 0: // back
          return [-1.0, 1.0-a, 3.0 - b]
        case 1: // left
          return [a-3.0, -1.0, 3.0 - b]
        case 2: // front
          return [1.0, a - 5.0, 3.0 - b]
        case 3: // right
          return [7.0-a, 1.0, 3.0 - b]
        case 4: // top
          return [b-1.0, a -5.0, 1.0]
        case 5: // bottom
          return [5.0-b, a-5.0, -1.0]
      }
    }

    /*

     *def convertBack(imgIn,imgOut):
    inSize = imgIn.size
    outSize = imgOut.size
    inPix = imgIn.load()
    outPix = imgOut.load()
    edge = inSize[0]/4   # the length of each edge in pixels
    for i in xrange(outSize[0]):
        face = int(i/edge) # 0 - back, 1 - left 2 - front, 3 - right
        if face==2:
            rng = xrange(0,edge*3)
        else:
            rng = xrange(edge,edge*2)

        for j in rng:
            if j<edge:
                face2 = 4 # top
            elif j>=2*edge:
                face2 = 5 # bottom
            else:
                face2 = face

            (x,y,z) = outImgToXYZ(i,j,face2,edge) */
  }

  stToNormal(s,t, face){
    let faceIx = this.faceIx[face];
    //s*=2; t*=2;
    let ss = s * 2 - 1;
    let tt = t * 2 - 1;

    if(face == 'back'){
      let res = [-1, -tt, ss ]
      return res;
    }
    if(face == 'front'){
      let res = [1, -tt, -ss];
      return res;
    }



    if(face == 'left'){
      //let res = [ss, -1.0, tt];
      let res = [ss, -1.0, -tt];
      return res;
    }
    if(face == 'right'){
      let res = [ss, 1.0, tt];
      return res;
    }


    if(face == 'top'){
      let res = [ss, -tt, 1.0];
      return res;
    }

    if(face == 'bottom'){
      let res = [-ss, -tt, -1.0];
      return res;
    }
  }

  ditance(from,to, radius){
    let diff = [0,1].map(i=>to[i] - from[i]);
    let a = Math.pow(Math.sin(diff[1]/2),2) + 
      Math.cos(from[1]) * Math.cos(to[1]) * Math.pow(Math.sin(diff[0]/2),2);
    let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return radius * c;
  }

  getList(center, size, radius){
    let textures = [];
    for(let face in this.texturesIndex){
      this.texturesIndex[face].forEach(texture=>{
        let {geoBounds, tix} = texture;
        if(geoBounds.filter(geo=>this.ditance(center, geo, radius) < size).length > 0)
          textures.push({...texture, ab: this.textures[tix]});


      })
    }
    return textures;

  }

}
