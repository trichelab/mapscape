// TREE FUNCTIONS

/* extract all info from tree about nodes, edges, ancestors, descendants
* @param {Object} vizObj 
*/
function _getTreeInfo(vizObj) {
    var userConfig = vizObj.userConfig,
        rootName = 'Root',
        cur_edges = userConfig.tree_edges;

    // get tree nodes
    vizObj.data.treeNodes = _.uniq(_.pluck(cur_edges, "source").concat(_.pluck(cur_edges, "target")));

    // get tree edges
    vizObj.data.treeEdges = [];
    for (var i = 0; i < cur_edges.length; i++) {
        vizObj.data.treeEdges.push({
            "source": cur_edges[i].source,
            "target": cur_edges[i].target
        })
    }

    // get tree structure
    var nodesByName = [];
    for (var i = 0; i < vizObj.data.treeEdges.length; i++) {
        var parent = _findNodeByName(nodesByName, vizObj.data.treeEdges[i].source);
        var child = _findNodeByName(nodesByName, vizObj.data.treeEdges[i].target);
        parent["children"].push(child);
    }
    vizObj.data.treeStructure = _findNodeByName(nodesByName, rootName);
    
    // get descendants for each node
    vizObj.data.treeDescendantsArr = {};
    vizObj.data.treeNodes.forEach(function(node, idx) {
        var curRoot = _findNodeByName(nodesByName, node);
        var curDescendants = _getDescendantIds(curRoot, []);
        vizObj.data.treeDescendantsArr[node] = curDescendants;
    })
    vizObj.data.direct_descendants = _getDirectDescendants(vizObj.data.treeStructure, {});

    // get ancestors for each node
    vizObj.data.treeAncestorsArr = _getAncestorIds(vizObj);
    vizObj.data.direct_ancestors = _getDirectAncestors(vizObj.data.treeStructure, {});

    // get siblings for each node
    vizObj.data.siblings = _getSiblings(vizObj.data.treeStructure, {}); 
}

/* function to find a key by its name - if the key doesn't exist, it will be created and added to the list of nodes
* @param {Array} list - list of nodes
* @param {String} name - name of key to find
*/
function _findNodeByName(list, name) {
    var foundNode = _.findWhere(list, {id: name}),
        curNode;

    if (!foundNode) {
        curNode = {'id': name, 'children': []};
        list.push(curNode);
        return curNode;
    }

    return foundNode;
}

/* function to get descendants id's for the specified key
* @param {Object} root - key for which we want descendants
* @param {Array} descendants - initially empty array for descendants to be placed into
*/
function _getDescendantIds(root, descendants) {
    var child;

    if (root["children"].length > 0) {
        for (var i = 0; i < root["children"].length; i++) {
            child = root["children"][i];
            descendants.push(child["id"]);
            _getDescendantIds(child, descendants);
        }
    }
    return descendants;
}

/* function to get the ancestor ids for all nodes
* @param {Object} vizObj
*/
function _getAncestorIds(vizObj) {
    var ancestors = {},
        curDescendants,
        descendants_arr = vizObj.data.treeDescendantsArr,
        treeNodes = vizObj.data.treeNodes;

    // set up each node as originally containing an empty list of ancestors
    treeNodes.forEach(function(node, idx) {
        ancestors[node] = [];
    })

    // get ancestors data from the descendants data
    treeNodes.forEach(function(node, idx) {
        // for each descendant of this node
        curDescendants = descendants_arr[node];
        for (var i = 0; i < curDescendants.length; i++) { 
            // add the node to descentant's ancestor list
            ancestors[curDescendants[i]].push(node);
        }
    })

    return ancestors;
}

/* function to get the DIRECT descendant id for all nodes
* @param {Object} curNode -- current node in the tree (originally the root)
* @param {Object} dir_descendants -- originally empty array of direct descendants for each node
*/
function _getDirectDescendants(curNode, dir_descendants) {
    dir_descendants[curNode.id] = [];

    if (curNode.children.length > 0) {
        for (var i = 0; i < curNode.children.length; i++) {
            dir_descendants[curNode.id].push(curNode.children[i].id);
            _getDirectDescendants(curNode.children[i], dir_descendants)
        }
    }

    return dir_descendants;
}

/* function to get the DIRECT ancestor id for all nodes
* @param {Object} curNode -- current node in the tree (originally the root)
* @param {Object} dir_ancestors -- originally empty array of direct descendants for each node
*/
function _getDirectAncestors(curNode, dir_ancestors) {

    if (curNode.children.length > 0) {
        for (var i = 0; i < curNode.children.length; i++) {
            dir_ancestors[curNode.children[i].id] = curNode.id;
            _getDirectAncestors(curNode.children[i], dir_ancestors)
        }
    }

    return dir_ancestors;
}

/* function to get the sibling ID's for each node
* @param {Object} curNode -- current node in the tree (originally the root)
* @param {Object} sibs -- originally empty array of siblings for each node
*/
function _getSiblings(curNode, sibs) {
    var cur_sibs = [];

    // get current siblings
    if (curNode.children.length > 0) {
        for (var i = 0; i < curNode.children.length; i++) {
            cur_sibs.push(curNode.children[i].id);
            _getSiblings(curNode.children[i], sibs)
        }
    }
    
    // note siblings for each sibling
    for (var i = 0; i < cur_sibs.length; i++) {
        for (var j = 0; j < cur_sibs.length; j++) {
            if (cur_sibs[j] != cur_sibs[i]) {
                sibs[cur_sibs[i]] = sibs[cur_sibs[i]] || [];
                sibs[cur_sibs[i]].push(cur_sibs[j]);
            }
        }
    }

    return sibs;
}

/* function to find the ancestors of the specified genotype that emerge at a particular time point
* @param {Object} layout -- for each time point, the interval boundaries for each genotype at that time point
* @param {Object} treeAncestorsArr -- for each genotype (properties), an array of their ancestors (values)
* @param {String} gtype -- the genotype of interest
* @param {String} tp -- the time point of interest
*/
function _findEmergentAncestors(layout, treeAncestorsArr, gtype, tp) {
    var ancestors = [],
        pot_ancestor; // potential ancestor

    // for each ancestral genotype, 
    for (var i = 0; i < treeAncestorsArr[gtype].length; i++) {
        pot_ancestor = treeAncestorsArr[gtype][i];

        // if this ancestor emerged here as well, increase the # ancestors for this genotype
        if (layout[tp][pot_ancestor] && layout[tp][pot_ancestor]["state"] == "emerges") {
            ancestors.push(pot_ancestor);
        }
    }

    return ancestors;
}

/* elbow function to draw phylogeny links 
*/
function _elbow(d) {
    return "M" + d.source.x + "," + d.source.y
        + "H" + (d.source.x + (d.target.x-d.source.x)/2)
        + "V" + d.target.y + "H" + d.target.x;
}

/*
* function to, using the tree hierarchy, get the linear segments' starting key and length (including starting key)
* @param {Object} curNode -- current key in the tree
* @param {Object} chains -- originally empty object of the segments 
*                           (key is segment start key, value is array of descendants in this chain)
* @param {Object} base -- the base key of this chain
*/
function _getLinearTreeSegments(curNode, chains, base) {

    // if it's a new base, create the base, with no descendants in its array yet
    if (base == "") {
        base = curNode.id;
        chains[base] = [];
    }
    // if it's a linear descendant, append the current key to the chain
    else {
        chains[base].push(curNode.id);
    }

    // if the current key has 1 child to search through
    if (curNode.children.length == 1) { 
        _getLinearTreeSegments(curNode.children[0], chains, base);
    }

    // otherwise for each child, create a blank base (will become that child)
    else {
        for (var i = 0; i < curNode.children.length; i++) {
            _getLinearTreeSegments(curNode.children[i], chains, "");
        }
    }

    return chains;
}