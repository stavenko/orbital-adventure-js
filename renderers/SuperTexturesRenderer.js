"use strict";
exports.__esModule = true;
var THREE = require("three");
var cubeMap_ts_1 = require("../math/cubeMap.ts");
var ScreenSpaceVertexShader_glsl_1 = require("../shaders/ScreenSpaceVertexShader.glsl");
var heightMapShader_glsl_1 = require("../shaders/heightMapShader.glsl");
var Optional = /** @class */ (function () {
    function Optional() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        if (args.length > 0) {
            var v = arguments[0];
            this.value = v;
            this._hasValue = true;
        }
        else {
            this._hasValue = false;
        }
    }
    Optional.prototype.get = function () {
        return this.value;
    };
    Object.defineProperty(Optional.prototype, "hasValue", {
        get: function () {
            return this._hasValue;
        },
        enumerable: true,
        configurable: true
    });
    Optional.init = function (arg) {
        return new Optional(arg);
    };
    Optional.none = function () {
        return new Optional;
    };
    return Optional;
}());
var TextureDescriptor = /** @class */ (function () {
    function TextureDescriptor(lod, coords, basisOfSurface, horizonDistance) {
        this.lod = lod;
        this.coords = coords;
        this.basisOfSurface = basisOfSurface;
        this.textureSize = horizonDistance;
        this.hash = ['', lod, '-', coords.st.x, 'x', coords.st.y, ': ', coords.face, horizonDistance].join('');
    }
    return TextureDescriptor;
}());
var SuperTextureRenderer = /** @class */ (function () {
    function SuperTextureRenderer(r) {
        this.NormalTileSteps = 3;
        this.Divisor = this.NormalTileSteps - 1;
        this.renderer = r;
        this.lodMap = new Map;
        this.tdMap = new Map;
        this.screenSpaceMesh = this.getScreenSpaceMesh();
        this.screenSpaceScene = new THREE.Scene;
        this.screenSpaceScene.add(this.screenSpaceMesh);
        this.heightMapMaterial = new THREE.RawShaderMaterial({
            uniforms: {},
            vertexShader: ScreenSpaceVertexShader_glsl_1["default"],
            fragmentShader: heightMapShader_glsl_1["default"],
            transparent: false
        });
    }
    SuperTextureRenderer.prototype.getScreenSpaceMesh = function () {
        var geom = new THREE.BufferGeometry();
        var vtx = new Float32Array([
            -1, -1,
            1, -1,
            1, 1,
            -1, 1
        ]);
        var ind = new Uint16Array([0, 1, 2, 0, 2, 3]);
        geom.addAttribute('sspoint', new THREE.BufferAttribute(vtx, 2, false));
        geom.setIndex(new THREE.BufferAttribute(ind, 1));
        var mesh = new THREE.Mesh(geom);
        mesh.frustumCulled = false;
        return mesh;
    };
    SuperTextureRenderer.prototype.getTexture = function (td) {
        if (this.tdMap.has(td.lod)) {
            var otd = this.tdMap.get(td.lod);
            if (otd.hash == td.hash) {
                return this.lodMap.get(td.lod).texture;
            }
        }
        this.prepareTexture(td);
        return this.lodMap.get(td.lod).texture;
    };
    SuperTextureRenderer.prototype.prepareTexture = function (textureDescriptor) {
        if (!this.lodMap.has(textureDescriptor.lod)) {
            this.createFramebuffer(textureDescriptor.lod);
            this.tdMap.set(textureDescriptor.lod, textureDescriptor);
        }
        this.renderFramebuffer(textureDescriptor, this.lodMap.get(textureDescriptor.lod));
    };
    SuperTextureRenderer.prototype.renderFramebuffer = function (td, fb) {
        this.setupUniforms(td);
        this.renderer.render(this.screenSpaceScene, this.__notUsedCamera, fb);
    };
    SuperTextureRenderer.prototype.setupUniforms = function (td) {
        var ufs = this.heightMapMaterial.uniforms;
        ufs.face = { value: td.coords.face };
        ufs.faceCoords = { value: td.coords.st };
        ufs.size = { value: td.textureSize };
    };
    SuperTextureRenderer.prototype.getSurfaceBasis = function (c) {
        var _a = cubeMap_ts_1.getFaceBasis(c.face), X = _a[0], Y = _a[1], Z = _a[2];
        var pointNormal = cubeMap_ts_1.cube2Normal(c);
        var rotation = this.getRotation(Z, pointNormal);
        return [X.clone().applyQuaternion(rotation), Y.clone().applyQuaternion(rotation)];
    };
    SuperTextureRenderer.prototype.getRotation = function (f, t) {
        var axis = new THREE.Vector3().crossVectors(f, t);
        var angle = f.angleTo(t);
        return new THREE.Quaternion().setFromAxisAngle(axis, angle);
    };
    SuperTextureRenderer.prototype.createFramebuffer = function (lod) {
        var fb = new THREE.WebGLRenderTarget(2048, 2048, {
            type: THREE.FloatType,
            format: THREE.RGBAFormat,
            depthBuffer: false,
            stencilBuffer: false
        });
        this.lodMap.set(lod, fb);
    };
    SuperTextureRenderer.prototype.getBaseTexture = function (sphereCoordsNormal, lod, horizonDistance) {
        var coords = cubeMap_ts_1.normal2Cube(sphereCoordsNormal);
        var currentNormalSteps = this.NormalTileSteps * lod;
        var alignedCoords = alignToNet(coords, currentNormalSteps);
        var divider = Math.pow(3, Math.max(lod, this.Divisor));
        var basisAtNormal = this.getSurfaceBasis(alignedCoords);
        return new TextureDescriptor(lod, alignedCoords, basisAtNormal, horizonDistance / divider);
    };
    SuperTextureRenderer.prototype.getTextureOfLod = function (bestLod, lodDiff, sphereCoordsNormal, horizonDistance) {
        var lod = bestLod - lodDiff;
        var divider = 0;
        if (lod < 0) {
            return Optional.none();
        }
        if (bestLod == 1) {
            divider = 1;
        }
        if (bestLod >= 2) {
            divider = Math.pow(3, this.Divisor - lodDiff);
        }
        var coords = cubeMap_ts_1.normal2Cube(sphereCoordsNormal);
        var currentNormalSteps = this.NormalTileSteps * lod;
        var alignedCoords = alignToNet(coords, currentNormalSteps);
        var basisAtNormal = this.getSurfaceBasis(alignedCoords);
        var t = new TextureDescriptor(lod, alignedCoords, basisAtNormal, horizonDistance / divider);
        return Optional.init(t);
    };
    SuperTextureRenderer.prototype.getTexturesDescriptorAt = function (planet, globalPosition, planetRotation, pixelFovRatio) {
        var result = [];
        var lod = this.findLowestLod(planet, globalPosition, pixelFovRatio);
        var sphereCoordsNormal = this.findNormal(planet, planetRotation, globalPosition);
        var horizonDistance = Math.acos(planet.spatial.radius / this.getDistanceToCenterOfPlanet(planet, globalPosition)) * planet.spatial.radius;
        var base = this.getBaseTexture(sphereCoordsNormal, lod, horizonDistance);
        for (var i = 1; i < 3; ++i) {
            var res = this.getTextureOfLod(base.lod, i, sphereCoordsNormal, horizonDistance);
            if (res.hasValue) {
                result.push(res.get());
            }
        }
        return result;
    };
    SuperTextureRenderer.prototype.findNormal = function (planet, planetRotation, globalPosition) {
        var cameraPosition = globalPosition.clone();
        var planetCenter = new ((_a = THREE.Vector3).bind.apply(_a, [void 0].concat(planet.spatial.position)))().sub(cameraPosition);
        planetCenter.negate().normalize();
        var inversePlanetRotation = planetRotation.clone().inverse();
        planetCenter.applyQuaternion(planetRotation);
        return planetCenter;
        var _a;
    };
    SuperTextureRenderer.prototype.findLowestLod = function (planet, globalPosition, pixelFovRatio) {
        var cameraPosition = globalPosition.clone();
        var planetCenter = new ((_a = THREE.Vector3).bind.apply(_a, [void 0].concat(planet.spatial.position)))().sub(cameraPosition);
        var distanceToCenter = planetCenter.length();
        var maxLodDistance = planet.spatial.radius * 0.5 / pixelFovRatio;
        var distanceToNearestSurfacePoint = distanceToCenter - planet.spatial.radius;
        var normalizedDistance = clamp(distanceToNearestSurfacePoint / maxLodDistance, 1e-6, 1.0);
        var heightBasedLOD = 12.0 - Math.max(0.0, Math.log2(normalizedDistance * 4096.0));
        return heightBasedLOD;
        var _a;
    };
    SuperTextureRenderer.prototype.getDistanceToCenterOfPlanet = function (planet, globalPosition) {
        var planetCenter = new ((_a = THREE.Vector3).bind.apply(_a, [void 0].concat(planet.spatial.position)))();
        return planetCenter.distanceTo(globalPosition);
        var _a;
    };
    return SuperTextureRenderer;
}());
exports.SuperTextureRenderer = SuperTextureRenderer;
function alignToNet(cc, grid) {
    var st = multiplyVec2(cc.st, grid);
    st.x = Math.round(st.x);
    st.y = Math.round(st.y);
    return new cubeMap_ts_1.CubeCoords(multiplyVec2(st, 1 / grid), cc.face);
}
function multiplyVec2(v, s) {
    return v.clone().multiplyScalar(s);
}
function clamp(v, m, M) {
    return Math.min(M, Math.max(v, m));
}
