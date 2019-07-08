import * as THREE from '../../../node_modules/three/build/three.js';

/**
 * Search a batch table in a tile. A tile is a THREE.js 3DObject with a 
 * 3-level hierarchy : Object3D > Scene > Mesh. This function searches into the
 * for the batch table (which is located in the Object3D level).
 * 
 * @param {*} tile A 3DTiles tile object from THREE.js.
 */
export function getBatchTableFromTile(tile) {
  if (!!tile.batchTable) {
    return tile.batchTable;
  } else if (!!tile.parent) {
    return getBatchTableFromTile(tile.parent);
  }
  return undefined;
}

/**
 * Gets an object batch ID from an intersection. This methods takes one of the
 * 3 points of the intersection triangle and retrieves the corresponding batch
 * ID in the intersection tile.
 * 
 * @param {*} inter An intersection
 */
export function getBatchIdFromIntersection(inter) {
  let index = inter.face.a;
  return inter.object.geometry.attributes._BATCHID.array[index];
}

/**
 * Get the first intersection object where the target is a 3D object with
 * a batch id (a.k.a. the "Mesh" of a tile).
 * 
 * @param {Array<any>} intersects The array of intersections, provided by
 * itowns.View.pickObjectsAt
 */
export function getFirstTileIntersection(intersects) {
  for (let inter of intersects) {
    let geomAttributes = inter.object.geometry.attributes;
    if (!!geomAttributes && !!geomAttributes._BATCHID) {
      return inter;
    }
  }
  return undefined;
}

/**
 * Retrieve all visible 3DTiles visible tiles (ie. those that are currently
 * rendered in the scene). This function recursively explores the tileset to
 * find all tiles and return them in a flattened array.
 * 
 * @param {*} layer The 3DTiles layer.
 */
export function getVisibleTiles(layer) {
  let rootTile = layer.object3d.children[0];
  let tiles = [];
  let exploreTree = (node) => {
    if (!!node.batchTable) {
      // It's an actual tile
      tiles.push(node);
    };
    node.children.forEach((child) => {
      if (child.type === 'Object3D') {
        //This child can be a tile or contain tiles so we explore it too
        exploreTree(child);
      }
    });
  };
  exploreTree(rootTile);
  return tiles;
}

/**
 * Counts the number of 3DTiles tiles displayed by the view.
 * 
 * @param {*} layer The 3DTiles layer.
 */
export function getVisibleTileCount(layer) {
  return getVisibleTiles(layer).length;
}

/**
 * Finds the tile in the tileset with the specific ID.
 * 
 * @param {*} tileset The 3DTiles tileset.
 * @param {*} tileId The tile id.
 */
export function getTileInTileset(tileset, tileId) {
  let tile = tileset.children.find((tile) => {
    return tile.tileId === tileId;
  });
  return tile;
}

/**
 * Find the tile in the 3DTiles layer with the specifid ID.
 * 
 * @param {*} layer The 3DTiles layer.
 * @param {*} tileId The tile id.
 */
export function getTileInLayer(layer, tileId) {
  let rootTile = layer.object3d.children[0];
  let tile = getTileInTileset(rootTile, tileId);
  return tile;
}

/**
 * Changes the color of a tile, or specific vertices of the tile, using the
 * BufferGeometry.
 * 
 * @param {*} tile The 3DTiles tile object from THREE.js
 * @param {Array<Number>} newColor An array of RGB value between 0 and 1.
 * @param {Array<Number>} [indexArray] Optional. The indexes of vertices to
 * change the color. By default, all vertices has their color changed. The array
 * is assumed to be **sorted** and **contiguous**.
 */
export function setTileVerticesColor(tile, newColor, indexArray = null) {
  if (!tile) {
    throw 'Tile not loaded in view';
  }

  //Find the 'Mesh' part of the tile
  while (!!tile.children[0] && !(tile.type === 'Mesh')) {
    tile = tile.children[0];
  }

  if (!tile.geometry.attributes._BATCHID) {
    throw 'Invalid tile';
  }

  if (tile.geometry.type !== 'BufferGeometry') {
    throw 'Cannot change vertices color';
  }

  //Create the new color array
  let indexCount = tile.geometry.attributes._BATCHID.count;
  let colors = new Float32Array(indexCount * 3);

  let lowerBound = indexArray[0];
  let upperBound = indexArray[indexArray.length - 1];
  for (let i = 0; i < indexCount; i++) {
    let vertexColor = newColor;
    if (!!indexArray && (lowerBound > i || upperBound < i)) {
      //If i is not one of the selected indexes, we keep the previous color
      let previousColor = (tile.geometry.attributes.color) ?
                          tile.geometry.attributes.color.array.slice(i * 3 , i * 3 + 3) :
                          tile.material.color.toArray();
      vertexColor = previousColor;
    }

    colors[i * 3     ] = vertexColor[0];
    colors[i * 3 + 1 ] = vertexColor[1];
    colors[i * 3 + 2 ] = vertexColor[2];
  }

  //We need to use the color of the vertices, not the material
  tile.material.vertexColors = THREE.VertexColors;

  if (!tile.geometry.attributes.color) {
    //If no vertex color is present, we need to add the BufferAttribute
    tile.geometry.addAttribute('color', new THREE.BufferAttribute(colors, 3));
  } else {
    //Else we need to update the existing attribute
    tile.geometry.attributes.color.set(colors);
    tile.geometry.attributes.color.needsUpdate = true;
  }
}

/**
 * Creates tile groups.
 * 
 * @param {*} tile The 3DTiles tile.
 * @param {*} groupColor The color for the specified vertices.
 * @param {number} groupOpacity The opacity for the specified verticies. It must
 * be a number between 0 and 1.
 * @param {Array<Array<number>>} ranges An array of ranges. A range is an array
 * of size two in the form [start, count], where start is the index of the first
 * vertex of the range and count is the number of vertices in the range.
 */
export function createTileGroups(tile, groupColor = 0xff00ff, groupOpacity = 1, ranges = []) {
  let mesh = getMesh(tile);

  if (!Array.isArray(mesh.material)) {
    //need to create the array
    mesh.material = [ mesh.material ];
  } else {
    //erase the other materials
    mesh.material = [ mesh.material[0] ];
  }

  // Clear the existing groups
  mesh.geometry.groups = [];

  // Total of vertices in the tile
  let total = mesh.geometry.attributes._BATCHID.count;

  if (ranges.length > 0) {
    // Create the new material
    mesh.material.push(new THREE.MeshLambertMaterial({
      color: groupColor,
      opacity: groupOpacity,
      transparent: true
    }));

    // Sort the ranges by increasing start index
    ranges.sort((a, b) => {
      return a[0] - b[0];
    });
    // Check for overlapping
    // TODO later

    // Adding groups for the new material
    for (let range of ranges) {
      mesh.geometry.addGroup(range[0], range[1], 1);
    }

    if (ranges[0][0] > 0) {
      mesh.geometry.addGroup(0, ranges[0][0], 0);
    }
    for (let i = 0; i < ranges.length - 1; ++i) {
      let start = ranges[i][0] + ranges[i][1];
      let count = ranges[i+1][0] - start;
      if (count > 0) {
        mesh.geometry.addGroup(start, count, 0);
      }
    }
    if (ranges[ranges.length - 1][0] + ranges[ranges.length - 1][1] < total) {
      let start = ranges[ranges.length - 1][0] + ranges[ranges.length - 1][1];
      mesh.geometry.addGroup(start, total - start, 0);
    }
  } else {
    // If no ranges array is specified, just add a group containing all vertices
    mesh.geometry.addGroup(0, total, 0);
  }
}

export function createTileGroupsFromBatchIDs(tile, groupColor, groupOpacity, batchIDs) {
  let ranges = [];

  let mesh = getMesh(tile);

  batchIDs.sort((a, b) => {
    return a - b;
  });

  let searchingIndex = 0;
  let searchingBatchID = batchIDs[searchingIndex];
  let addingRange = [];

  for (let index = 0; index < mesh.geometry.attributes._BATCHID.count; index++) {
    let batchID = mesh.geometry.attributes._BATCHID.array[index];

    if (batchID > searchingBatchID) {
      addingRange.push(index - addingRange[0]);
      ranges.push(addingRange);
      addingRange = [];
      searchingIndex += 1;
      searchingBatchID = batchIDs[searchingIndex];
    }

    if (batchID === searchingBatchID && addingRange.length === 0) {
      addingRange.push(index);
    }

    if (index === mesh.geometry.attributes._BATCHID.count - 1 && addingRange.length === 1) {
      addingRange.push(index - addingRange[0] + 1);
      ranges.push(addingRange);
    }
  }

  createTileGroups(mesh, groupColor, groupOpacity, ranges);
}

/**
 * Removes vertex-specific colors of the tile and switch back to the material's
 * color.
 * 
 * @param {*} tile The 3DTiles tile.
 */
export function removeTileVerticesColor(tile) {
  if (!tile) {
    throw 'Tile not loaded in view';
  }

  //Find the 'Mesh' part of the tile
  while (!!tile.children[0] && !(tile.type === 'Mesh')) {
    tile = tile.children[0];
  }

  if (!tile.geometry.attributes._BATCHID) {
    throw 'Invalid tile';
  }

  if (tile.geometry.type !== 'BufferGeometry') {
    throw 'Cannot change vertices color';
  }

  //Remove color attribute
  tile.geometry.removeAttribute('color');

  //We go back to the color of the material
  tile.material.vertexColors = THREE.NoColors;
}

/**
 * Tells the iTowns view to update the scene. If you made changes to some colors
 * for example, you need to call this function to actually see the changes.
 * 
 * @param {*} view The iTowns view.
 */
export function updateITownsView(view, layer) {
  try {
    view.mainLoop.gfxEngine.renderViewToBuffer({
      scene: layer.object3d,
      camera: view.camera
    }, { x: 0, y: 0, width: 0, height: 0 });
    view.notifyChange();
  } catch (e) {
    console.error(e);
  }
}

/**
 * Computes and returns the centroid of the vertices given as parameter.
 * 
 * @param {*} tile The 3DTiles tile.
 * @param {*} indexArray The indexes of the vertices. It is assumed to be
 * **sorted** and **contiguous**.
 * 
 * @returns {THREE.Vector3} The centroid of the vertices.
 */
export function getVerticesCentroid(tile, indexArray) {
  if (!tile) {
    throw 'Tile not loaded in view';
  }

  //Find the 'Mesh' part of the tile
  while (!!tile.children[0] && !(tile.type === 'Mesh')) {
    tile = tile.children[0];
  }

  if (!tile.geometry.attributes._BATCHID) {
    throw 'Invalid tile';
  }

  if (tile.geometry.type !== 'BufferGeometry') {
    throw 'Cannot change vertices color';
  }

  let vertexSum = new THREE.Vector3(0, 0, 0);
  let positionArray = tile.geometry.attributes.position.array;
  for (let i = indexArray[0]; i <= indexArray[indexArray.length - 1]; ++i) {
    vertexSum.x += positionArray[i * 3    ];
    vertexSum.y += positionArray[i * 3 + 1];
    vertexSum.z += positionArray[i * 3 + 2];
  }
  let vertexCount = indexArray.length;
  let vertexCentroid = vertexSum.divideScalar(vertexCount).applyMatrix4(tile.matrixWorld);
  return vertexCentroid;
}

function getMesh(tile) {
  if (!tile) {
    throw 'Tile not loaded in view';
  }

  //Find the 'Mesh' part of the tile
  while (!!tile.children[0] && !(tile.type === 'Mesh')) {
    tile = tile.children[0];
  }

  if (!tile.geometry.attributes._BATCHID) {
    throw 'Invalid tile';
  }

  if (tile.geometry.type !== 'BufferGeometry') {
    throw 'Tile has no buffer geometry';
  }

  return tile;
}