import {Vector2} from 'three/src/math/Vector2';
import {Vector3} from 'three/src/math/Vector3';
import {Matrix4} from 'three/src/math/Matrix4';
import {Plane} from 'three/src/math/Plane';
import {OrthographicCamera} from 'three/src/cameras/OrthographicCamera.js';
// import * as cubeMap from '../math/cubeMap.js';

const TextureSize = 512;
export class TileRetriver {
  constructor() {
    // cubeMap.tileMath();
  }

  lineSphereIntersection(line, sphere, both = false) {
    const pMinusC = line.origin.clone().sub(sphere.center);
    const a = line.dir.dot(line.dir);
    const b = 2 * line.dir.dot(pMinusC); 
    const c = pMinusC.dot(pMinusC) - Math.pow(sphere.radius, 2);
    const D = b * b - 4 * a * c;
    switch (true) {
      case D > 0: {
        const t1 = Math.max(0, (-b + Math.sqrt(D)) / (2 * a));
        const t2 = Math.max(0, (-b - Math.sqrt(D)) / (2 * a));
        if (!both) {
          return Math.min(t1, t2);
        } else {
          return [t1, t2];
        }
      }
      case D === 0: {
        if (!both) {
          return -b / (2 * a);
        } else {
          return [-b / (2 * a)];
        }
      } 
      default:
        return null;
    }
  }

  planeIntersection(p1, p2) {
    const dir = p1.normal.clone().cross(p2.normal);
    if (dir.length() === 0) {
      return null;
    }
    const s1 = p1.constant;
    const s2 = p2.constant;
    const n1n2dot = p1.normal.dot(p2.normal);
    const n1normsqr = p1.normal.dot(p1.normal);
    const n2normsqr = p2.normal.dot(p2.normal);
    const a = (s2 * n1n2dot - s1 * n2normsqr) / (n1n2dot * n1n2dot - n1normsqr * n2normsqr);
    const b = (s1 * n1n2dot - s2 * n2normsqr) / (n1n2dot * n1n2dot - n1normsqr * n2normsqr);
    const p2a = p2.normal.clone().multiplyScalar(b);
    const origin = p1.normal.clone()
      .multiplyScalar(a) 
      .add(p2a);
    return {origin, dir};
  }
  tileSidePlaneIntersection(normal1, normal2, plane, spherePosition, sphereRadius) {
    
  }

  kross(v1, v2) {
    return v1.x * v2.y - v2.x * v1.y;
  }

  intersectRays(ray1, ray2) {
    const D = ray2.origin.clone().sub(ray1.origin);
    const d = this.kross(ray1.dir, ray2.dir);

    if (d === 0) {
      return Infinity;
    }
    return this.kross(D, ray2.dir) / d;
  }

  createPlane(a, b, c, d) {
    const n = new Vector3(a, b, c).normalize();
    return new Plane(n, d);
  }

  findCameraFrustumPlanes(camera) {
    const viewMatrix = new Matrix4().getInverse(camera.matrixWorld);
    const matrix = new Matrix4().multiplyMatrices(camera.projectionMatrix, viewMatrix);
    this.__cameraProj = matrix.clone();
    const elems = matrix.elements;
    const left = this.createPlane(
      elems[3] + elems[0], 
      elems[7] + elems[4],
      elems[11] + elems[8],
      elems[15] + elems[12],
    );
    const right = this.createPlane(
      elems[3] - elems[0], 
      elems[7] - elems[4],
      elems[11] - elems[8],
      elems[15] - elems[12],
    );

    const bottom = this.createPlane(
      elems[3] + elems[1], 
      elems[7] + elems[5],
      elems[11] + elems[9],
      elems[15] + elems[13],
    );

    const top = this.createPlane(
      elems[3] - elems[1], 
      elems[7] - elems[5],
      elems[11] - elems[9],
      elems[15] - elems[13],
    );

    const near = this.createPlane(
      elems[3] + elems[2], 
      elems[7] + elems[6],
      elems[11] + elems[10],
      elems[15] + elems[14],
    );

    const far = this.createPlane(
      elems[3] - elems[2], 
      elems[7] - elems[6],
      elems[11] - elems[10],
      elems[15] - elems[14],
    );
    this.frustumPlanes = {left, right, top, bottom, near, far};
    // console.log('-------', matrix.elements);

    function prPlane(pl) {
      return [pl.normal.x, pl.normal.y, pl.normal.z, pl.constant].join(', ');
    }
  }

  projectNormal(normal, camera) {
    const v = new Matrix4().getInverse(camera.matrixWorld);
    return normal.clone().applyMatrix4(v).applyProjection(camera.projectionMatrix);
  }

  calculateLodForPointOnSphere(surfacePoint, radius, camera) {
    const distanceToPoint = surfacePoint.length();
    const fovPerPixel = camera._fovPerPixel;
    const pixelSizeAtDistance = distanceToPoint * fovPerPixel;
    const divider = 4 * pixelSizeAtDistance * TextureSize;
    const lod = Math.log2(2 * Math.PI * radius / divider );

    return Math.min(23, Math.max(0, Math.floor(lod)));

      
  }

  simpleLodAndNormal(camera, planetCenter, radius, planetRotation) {
    // console.log('simple');
    const surfaceNormal = planetCenter.clone().normalize().negate();
    const surfacePoint = surfaceNormal.clone().multiplyScalar(radius).add(planetCenter);
    const inverseRotation = planetRotation.clone().inverse();
    surfaceNormal.applyQuaternion(inverseRotation);
    const lod = this.calculateLodForPointOnSphere(surfacePoint, radius, camera);
    return [surfaceNormal, lod];
  }

  pointPlaneDistance(plane, point) {
    const D = point.clone().sub(plane.coplanarPoint());
    const h = plane.normal.dot(D);
    return h;
  }

  projectOnPlane(plane, point) {
    const D = point.clone().sub(plane.coplanarPoint());
    const h = plane.normal.dot(D);
    const n = plane.normal.clone().multiplyScalar(h);
    const v = D.sub(n);
    return v;
  }

  planeSphereIntersectionClosestPoint(plane, sphere) {
    // return circle with 2D center on plane related to origin and radius
    const h = this.pointPlaneDistance(plane, sphere.center);
    const r = Math.sqrt(sphere.radius * sphere.radius - h * h);
    const center = this.projectOnPlane(plane, sphere.center);
    const Ray = {dir: center, origin: new Vector3};
    const Sphere = {radius: r, center};
    const dist = this.lineSphereIntersection(Ray, Sphere);
    return Ray.dir.clone().multiplyScalar(dist);

  }

  pointWithinOrtogonalPlanes(plane, point) {
    let planes;
    if (plane === 'top' || plane === 'bottom') {
      planes = ['left', 'right'];
    }
    if (plane === 'left' || plane === 'right') {
      planes = ['top', 'bottom'];
    }
    for (let i = 0; i < planes.length; ++i) {
      const pl = this.frustumPlanes[planes[i]];
      const H = pl.normal.dot(point);
      const ph = H - pl.constant;
      if (ph < 0) {
        return false;
      }
    }
    return true;
  }

  findSphereIntersectionInFrustumCorners(camera, planet) {
    const coords = [[-1, -1, 0.9], [-1, 1, 0.9], [1, -1, 0.9], [1, 1, 0.9]];
    let distance = Infinity;
    let foundPoint = null;
    for (let i = 0; i < coords.length; ++i) {
      const p = new Vector3(...coords[i]);
      p.unproject(camera);
      const intersection = this.lineSphereIntersection({origin: new Vector3, dir: p.clone()}, {center: planet.planetCenter, radius: planet.radius});
      if (!intersection) {
        continue;
      }
      p.multiplyScalar(intersection);
      const dist = p.length();
      if (dist < distance) {
        distance = dist;
        foundPoint = p;
      }
    }
    return foundPoint;
  }

  lodAndNormalFromFrustumPlanes(camera, planet) {
    // console.log('from planes'); // need to find arcs 
    const planes = ['left', 'right', 'top', 'bottom'];
    let foundPoint = null;
    let distance = Infinity;

    for (let i = 0; i < planes.length; ++i) {
      const plane = this.frustumPlanes[planes[i]];
      const point = this.planeSphereIntersectionClosestPoint(plane, {radius: planet.radius, center: planet.planetCenter.clone()});
    
      if (this.pointWithinOrtogonalPlanes(planes[i], point)) {
        const distanceToPoint = point.length();
        if (distance > distanceToPoint) {
          distance = distanceToPoint;
          foundPoint = point;
        }
      } else {
        // console.log("found point", foundPoint, 'not within planes');
      }
    }
    if (foundPoint === null) {
      foundPoint = this.findSphereIntersectionInFrustumCorners(camera, planet);
    }
    if (foundPoint === null) {
      // we did almost everything to find closest point of sphere on frustum
      // borders and failed
      return null;
    }
    const radius = planet.radius;
    const lod = this.calculateLodForPointOnSphere(foundPoint.clone(), radius, camera);
    const surfaceNormal = foundPoint.clone().sub(planet.planetCenter);
    const inverseRotation = planet.planetRotation.clone().inverse();
    surfaceNormal.normalize().applyQuaternion(inverseRotation);
    return [surfaceNormal, lod];
  }

  lodAndNormalFrom(planetCenterProjected, camera, planet) {

    // console.log("complex", planetCenterProjected.x, planetCenterProjected.y);
    const {planetCenter, radius, planetRotation} = planet;
    const dir = new Vector2(planetCenterProjected.x, planetCenterProjected.y);
    const R = {origin: new Vector2, dir};
    const sides = [
      {origin: new Vector2(-1, -1), dir: new Vector2(0, 2)},
      {origin: new Vector2(-1, -1), dir: new Vector2(2, 0)},
      {origin: new Vector2(1, 1), dir: new Vector2(-2, 0)},
      {origin: new Vector2(1, 1), dir: new Vector2(0, -2)}
    ];

    const crosses = sides.map(s => this.intersectRays(R, s));
    const minPositive = crosses.filter(t => t > 0).reduce((a, m) => Math.min(a, m), Infinity);
    const screenIntersection = dir.clone().multiplyScalar(minPositive);
    const worldRay = this.getWorldRay(screenIntersection, camera);
    const intersection = this.intersectWithPlanet(worldRay, planet);
    if (!intersection) {
      return null;
    }

    const [surfaceNormal, surfacePoint] = intersection;
    const lod = this.calculateLodForPointOnSphere(surfacePoint, radius, camera);
    return [surfaceNormal, lod];

  }

  intersectWithPlanet(worldRay, planet) {
    // camera is still in 0,0,0
    const ray = {dir: worldRay, origin: new Vector3};
    const sphere = {center: planet.planetCenter, radius: planet.radius};
    const t = this.lineSphereIntersection(ray, sphere);
    if (!t) {
      return null;
    }
    const surfacePoint = worldRay.clone().multiplyScalar(t);
    const surfaceNormal = surfacePoint.clone().sub(planet.planetCenter)
      .normalize()
      .applyQuaternion(planet.planetRotation.clone().inverse());
    return [surfaceNormal, surfacePoint];
  }

  getWorldRay(screenPoint, camera) {
    const d = new Vector3(screenPoint.x, screenPoint.y, 0.9);
    const ip = new Matrix4().getInverse(camera.projectionMatrix);
    const m = new Matrix4().multiplyMatrices(camera.matrixWorld, ip);
    d.applyProjection(m);
    d.normalize();
    return d;
  }


  findClosestNormalAndLod(camera, planet) { 
    const planetCenter = planet.planetCenter.clone();
    planetCenter.applyMatrix4(camera._viewMatrix).applyProjection(camera.projectionMatrix);
    if (Math.abs(planetCenter.x) < 1 && Math.abs(planetCenter.y) < 1) {
      return this.simpleLodAndNormal(camera, planet.planetCenter, planet.radius, planet.planetRotation);
    } else {
      return this.lodAndNormalFromFrustumPlanes(camera, planet);
      // return this.lodAndNormalFrom(planetCenter, camera, planet);
    }
  }

  getFirstTile(closestLod, closestNormal) {
    const lod = closestLod;
    // const face = cubeMap.determineFace(closestNormal);
    // const st = cubeMap.getSt(closestNormal.toArray(), face);
    // const tileCoords = cubeMap.findTile(cubeMap.st2uv(st), lod);
    // const tile = cubeMap.calculateTile(tileCoords, lod);
    return {tile, lod, face, tileCoords};
    
  }
  
  retrieveTileFromCamera(camera, planet) {
    this.findCameraFrustumPlanes(camera);
    const closestPlanetPoint = this.findClosestNormalAndLod(camera, planet);
    if (!closestPlanetPoint) {
      return null;
    }
    const [closestNormal, closestLod] = this.findClosestNormalAndLod(camera, planet);
    const firstTile = this.getFirstTile(closestLod, closestNormal);
    // console.log(closestLod, closestNormal);
    // console.log(firstTile.tileCoords.x, firstTile.tileCoords.y);
    this.__camera = camera;
    const tiles = this.findAllTiles(camera, planet, firstTile);
    return tiles;
  }

  resetCollectedTiles() {
    this.tileFrustumCheckCache = new Map;
    this.collectedTiles = new Map;
  }



  findAllTiles(camera, planet, firstTile) {
    this.resetCollectedTiles();
    const __t = Date.now();
    this.pushTileWithNeiboursInFrustum(camera, planet, firstTile);
    console.log('---', Date.now() - __t);
    this.splitLowerLodsToHalfs();
    // console.log("======================");
    let count = 0;
    for (const {lod, faceTileMap} of this.collectedTiles.values()) {
      for (const {tiles} of faceTileMap.values()) {
        count += tiles.size;
      }
    }
    console.log('collected tiles', count);
    return this.collectedTiles;
  }

  splitLowerLodsToHalfs() {
    // do it later
  }

  _getLodDescriptor(lod) {
    if (!this.collectedTiles.has(lod)) {
      this.collectedTiles.set(lod, {lod, faceTileMap: new Map});
    }
    return this.collectedTiles.get(lod);
  }
  _getFaceTiles(faceTileMap, face) {
    if (!faceTileMap.has(face)) {
      faceTileMap.set(face, {tiles: new Map});
    }
    return faceTileMap.get(face);
  }

  fromTile(lod, tile) {
    const div = Math.pow(2, lod);
    const TJ = Math.floor(tile / div);
    const TI = Math.floor(tile % div);
    return [TJ, TI];
  }

  putToResultingTiles(face, lod, tile, tileCoords) {
    const lodData = this._getLodDescriptor(lod);
    const tileSet = this._getFaceTiles(lodData.faceTileMap, face);
    if (tileSet.tiles.has(tile)) {
      return false;
    }
    tileSet.tiles.set(tile, tileCoords);
    return true;
  }

  *neigbours(lod, face, J, I) {
    const max = Math.pow(2, lod) - 1;
    const min = 0;
    for (let j = -1; j <= 1; ++j) {
      for (let i = -1; i <= 1; ++i) {
        if (j === 0 && i === 0) {
          continue;
        }

        const Jj = J + j;
        const Ii = I + i;
        if (Jj > max || Jj < min || Ii > max || Ii < min) {
          yield this.faceShiftedTile(lod, face, Jj, Ii); 
        } else {
          const tileCoords = [Jj, Ii];
          // const tile = cubeMap.calculateTile(tileCoords, lod);
          if (Jj < 0 || Ii < 0) {
            
          }
          // yield {face, tile, tileCoords: cubeMap.vec2(Jj, Ii)};
        }
      }
    }
  }
  neigbourTiles(lod, face, J, I) {
    const div = Math.pow(2, lod); 
    const max = div - 1;
    const min = 0;
    const neigbours = [];
    for (let j = -1; j <= 1; ++j) {
      for (let i = -1; i <= 1; ++i) {
        if (j === 0 && i === 0) {
          continue;
        }

        const Jj = J + j;
        const Ii = I + i;
        if (Jj > max || Jj < min || Ii > max || Ii < min) {
          neigbours.push(this.faceShiftedTile(lod, face, [J, j], [I, i])); 
        } else {
          const tileCoords = [Jj, Ii];
          // const tile = cubeMap.calculateTile(tileCoords, lod);
          if (Jj < 0 || Ii < 0) {
            
          }
          // neigbours.push({face, tile, tileCoords: cubeMap.vec2(Jj, Ii)});
        }
      }
    }
    return neigbours;

    function getBetter(I, max, min) {
      switch (true) {
        case I > max: return I + 1e-12;
        case I < min: return I - 1e-12;
        default:
          return I;
      }
    }

  }

  faceShiftedTile(lod, face, [J, j], [I, i]) {
    const div = Math.pow(2, lod);

    const uv = cubeMap.vec2(getV(J, j, div), getV(I, i, div));
    const normal = cubeMap.st2Normal(cubeMap.uv2st(uv), face).normalize();
    const newFace = cubeMap.determineFace(normal);
    const newSt = cubeMap.st2uv(cubeMap.getSt(normal, newFace));
    const newJI = cubeMap.findTile(newSt, lod);
    const newTile = cubeMap.calculateTile(newJI, lod);
    return {face: newFace, tile: newTile, tileCoords: newJI};

    function getV(I, i, div) {
      const tw = 1 / div;
      switch (true) {
        case (I + i) < 0: {
          console.log('too low');
          const edge = 0;
          const nextTileCenter = edge - tw / 2;
          return nextTileCenter;
        }
        case (I + i) > (div - 1): {
          console.log('too high');
          const edge = 1;
          const nextTileCenter = edge + tw / 2;
          return nextTileCenter;
        }
        default: {
          const edge = (I + i) / div;
          const nextTileCenter = edge;
          return nextTileCenter;
        }
      }
    }

  }

  getPlanetCoords(face, uv, planet) {
    return new Vector3(...cubeMap.st2Normal(cubeMap.uv2st(uv), face))
      .normalize()
      .applyQuaternion(planet.planetRotation)
      .multiplyScalar(planet.radius)
      .add(planet.planetCenter);
  }

  tileCentralPointOnSameLod(face, lod, tileCoords, planet) {
    // return true;
    const div = Math.pow(2, lod);
    const tileU = tileCoords.x / div;
    const tileV = tileCoords.y / div;
    const duv = 0.5 / div;
    const surfacePoint = this.getPlanetCoords(face, cubeMap.vec2(tileU + duv, tileV + duv), planet);
    const tileCenterLod = this.calculateLodForPointOnSphere(surfacePoint, planet.radius, this.__camera);
    return tileCenterLod === lod;
  }

  getTileSphereCoords(face, tileCoords, lod, planet) {
    const div = Math.pow(2, lod);
    const tileU = tileCoords.x / div;
    const tileV = tileCoords.y / div;
    const duv = 1.0 / div;
    let coords = [
      cubeMap.vec2(tileU, tileV), 
      cubeMap.vec2(tileU + duv, tileV ), 
      cubeMap.vec2(tileU, tileV + duv ), 
      cubeMap.vec2(tileU + duv, tileV + duv )
    ];
    const inv = planet.planetRotation.clone().inverse();
    coords = coords.map(uv => this.getPlanetCoords(face, uv, planet));

    return coords;
  }

  getArcPlane(arc, sphere) {
    const n1 = arc[0].clone().sub(sphere.center);
    const n2 = arc[1].clone().sub(sphere.center);
    const n = n1.cross(n2).normalize();
    return new Plane().setFromNormalAndCoplanarPoint(n, sphere.center.clone());
  }

  getLinePoint(t, line) {
    return line.dir.clone().multiplyScalar(t).add(line.origin);
  }


  isPointOnPlane(point, plane) {
    const dot = plane.normal.dot(point);
    return (dot - plane.constant) < 1e-10;
  }

  checkIfPointWithinArc(a0, a1, b0, b1) {
    const A = Math.max(a0, a1);
    const a = Math.min(a0, a1);
    const b = Math.min(b0, b1);
    const B = Math.max(b0, b1);

    return btw(a, A, b) || btw(a, A, B) || btw(b, B, a) || btw(b, B, A);

    function btw(a, A, b) {
      return b > a && b <= A;
    }
  }
  checkIfAngleWithinArc(a, b, B) {
    [b, B] = [b, B].sort();
    return a > b && a <= B;
  }

  arcWithinIntersection(arc, arcPlane, pointsOnSphere, sphere) {
    // arc = arc.map(x => new Vector3(...x).sub(sphere.center));
    pointsOnSphere = pointsOnSphere.map(x => x.sub(sphere.center));
    const arcPlaneX = this.projectOnPlane(arcPlane, arc[0]).normalize();
    const arcPlaneY = arcPlaneX.clone().cross(arcPlane.normal).normalize();
    const arc1v0 = arc[0].clone();
    const arc1v = arc[1].clone(); //.normalize();
    const arc2v1 = pointsOnSphere[0];//.normalize();
    const arc2v2 = pointsOnSphere[1];//.normalize();
    //console.log(arc1v.clone().sub(arcPlane.coplanarPoint()).dot(arcPlane.normal), 
    //            arc2v1.clone().sub(arcPlane.coplanarPoint()).dot(arcPlane.normal), 
    //            arc2v2.clone().sub(arcPlane.coplanarPoint()).dot(arcPlane.normal));
    const arcPoint0 = [arc1v0.dot(arcPlaneX), arc1v0.dot(arcPlaneY), arc1v0.dot(arcPlane.normal)];
    const arcPoint1 = [arc1v.dot(arcPlaneX), arc1v.dot(arcPlaneY), arc1v.dot(arcPlane.normal)];
    const circlePoint1 = [arc2v1.dot(arcPlaneX), arc2v1.dot(arcPlaneY), arc2v1.dot(arcPlane.normal)];
    const circlePoint2 = [arc2v2.dot(arcPlaneX), arc2v2.dot(arcPlaneY), arc2v2.dot(arcPlane.normal)];
    const arcAngle = Math.atan2(arcPoint1[1], arcPoint1[0]);
     
    const angleToPoint1 = Math.atan2(circlePoint1[1], circlePoint1[0]);
    const angleToPoint2 = Math.atan2(circlePoint2[1], circlePoint2[0]);
    if (this.checkIfAngleWithinArc(angleToPoint1, 0, arcAngle)) {
      return pointsOnSphere[0];
    }

    if (this.checkIfAngleWithinArc(angleToPoint2, 0, arcAngle)) {
      return pointsOnSphere[1];
    }

    // return this.checkIfPointWithinArc(0, arcAngle, angleToPoint1, angleToPoint2);
  }

  testArcPlaneIntersection(arc, plane, sphere) {
    const arcPlane = this.getArcPlane(arc, sphere);
    const planeIntersection = this.planeIntersection(arcPlane, plane);
    if (!planeIntersection) {
      return null;
    }
    const intersections = this.lineSphereIntersection(planeIntersection, sphere, true);
    if (!intersections) {
      return null;
    }
    const pointsOnSphere = intersections.map(t => this.getLinePoint(t, planeIntersection));
    return this.arcWithinIntersection(arc, arcPlane, pointsOnSphere, sphere);
  }

  tileHash(tile) {
    const hash = [tile.face, tile.lod, tile.tileCoords.x, tile.tileCoords.y].join('-');
    return hash;
  }
  
  isIntersectedWithCameraFrustumPlanes_(face, tileCoords, lod, planet) {
    const cornerPoints = this.getTileSphereCoords(face, tileCoords, lod, planet);
    const arcs = [
      [cornerPoints[0], cornerPoints[1]],
      [cornerPoints[1], cornerPoints[2]],
      [cornerPoints[2], cornerPoints[3]],
      [cornerPoints[3], cornerPoints[0]]
    ];
    const planeNames = ['left', 'right', 'top', 'bottom'];
    const sphere = {center: planet.planetCenter.clone(), radius: planet.radius};
    for (let c = 0; c < arcs.length; ++c) {
      const arc = arcs[c];
      for (let p = 0; p < planeNames.length; ++p) {
        const plane = this.frustumPlanes[planeNames[p]];
        const intersectedPoint = this.testArcPlaneIntersection(arc, plane, sphere);
        if (!intersectedPoint) {
          return false;
        }
        if (this.pointWithinFrustum(intersectedPoint)) {
          return true;
        }
      }
    }
    return false;
  }

  pointBetweenFrutumPlanes(point, ix) {
    const keys = ['left', 'right', 'top', 'bottom'];
    for (let i = 0; i < keys.length; ++i) {
      const pl = this.frustumPlanes[keys[i]];
      const H = pl.normal.dot(point);
      const ph = H - pl.constant;
      if (ph < 0) {
        //console.log('not ok', ph, ix)
        return false;
      } else {
        //console.log( keys[i], ph, ' ok ' ,ix)
      }

    }
    return true;
  }

  isWithinCameraFustum(face, tileCoords, lod, planet) {
    const cornerPoints = this.getTileSphereCoords(face, tileCoords, lod, planet);
    const ids = cornerPoints.filter((point, ix) => this.pointBetweenFrutumPlanes(point, ix));
    if (ids.length > 0 ) {
      return true;
    }


  }

  pointWithinFrustum(point) {
    const screen = point.clone().project(this.__camera);
    const near = near1(screen.x) && near1(screen.y);
    if (near) {
      console.log('vars--->', screen.x, screen.y);
      console.log('vars--->', point.x, point.y, point.z);
    }
    return near;
    
    function near1(a) {
      return Math.abs(a) < 1.5;
    }
  }

  isIntersectedWithCameraFrustumPlanes(face, tc, l, pl) {
    const tile = {face, tileCoords: tc, lod: l};
    const hash = this.tileHash(tile);
    if (!this.tileFrustumCheckCache.has(hash)) {
      //const intersected = this.isIntersectedWithCameraFrustumPlanes_(face, tc, l, pl);
      const intersected = this.isWithinCameraFustum(face, tc, l, pl);
      this.tileFrustumCheckCache.set(hash, intersected);
      return intersected;
    }
    return this.tileFrustumCheckCache.get(hash);
  }


  getTileOfUpperLod(face, lod, tileCoords) {
    const J = Math.floor(tileCoords.x / 2);
    const I = Math.floor(tileCoords.y / 2);
    const tile = this.toTile(lod - 1, J, I);
    return {tile, face, tileCoords: cubeMap.vec2(J, I), lod: lod - 1};
  }

  toTile(lod, I, J) {
    const div = Math.pow(2, lod);
    const max = div - 1;
    const min = 0;
    return Math.max(min, Math.min(J, max)) * div + Math.max(min, Math.min(I, max));
  }


  pushTileWithNeiboursInFrustum(camera, planet, firstTile, deepness = 0) {
    const [J, I] = firstTile.tileCoords; // this.fromTile(firstTile.lod, firstTile.tile);
    const isNew = this.putToResultingTiles(firstTile.face, firstTile.lod, firstTile.tile, firstTile.tileCoords);
    if (!isNew) {
      console.log(deepness, 'not new - return');
      return;
    }
    if (deepness > 30) {
      return;
    }
    console.log(deepness, ' just putted: ', firstTile.face, firstTile.tileCoords.x, firstTile.tileCoords.y);

    const __t = Date.now();
    const _neighbors = this.neigbourTiles(firstTile.lod, firstTile.face, J, I);
    for (let i = 0; i < _neighbors.length; ++i) {
      const {face, tile, tileCoords} = _neighbors[i];

      if (this.tileCentralPointOnSameLod(face, firstTile.lod, tileCoords, planet)) {
        if (this.isIntersectedWithCameraFrustumPlanes(face, tileCoords, firstTile.lod, planet)) {
          const nextTile = {face, tile, tileCoords, lod: firstTile.lod};
          this.pushTileWithNeiboursInFrustum(camera, planet, nextTile, deepness + 1);
        }
      } else {
        console.log('getHighe lod!');
        const nextTile = this.getTileOfUpperLod(face, firstTile.lod, firstTile.tileCoords);
        if (this.isIntersectedWithCameraFrustumPlanes(nextTile.face, nextTile.tileCoords, nextTile.lod, planet)) {
          this.pushTileWithNeiboursInFrustum(camera, planet, nextTile, deepness + 1);
        }
        
      }
    }
    // console.log('==loop==',deepness,  Date.now() - __t);
  
  }
}