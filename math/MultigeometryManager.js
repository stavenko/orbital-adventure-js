
export class MultigeometryManager {
  constructor(indexator) {
    this.indexator = indexator;
    this.arrays = {};
    this.faces = [];
    this.currentIndex = 0;
    this.pointIx = new Map;
    this.posArray = [];
  }

  pushFace(...args) {
    this.faces.push(...args);
  }

  getPointIndex(pointCreator, ...args) {
    const index = this.indexator(...args);
    if (this.pointIx.has(index)) {
      return this.pointIx.get(index);
    }
    const point = pointCreator(...args);
    const p = point.position;
    this.posArray.push([index, p]);
    for (const k in point) {
      if (!this.arrays[k]) {
        this.arrays[k] = [];
      }
      this.arrays[k].push(...point[k].toArray());
    }
    this.pointIx.set(index, this.currentIndex);
    return this.currentIndex++;
  }
}
