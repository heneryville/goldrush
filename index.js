var DotParser = require('./dot-parser')
  , DotGraph = require('./dot-graph')
  , fs = require('fs')
  , util = require('util')
  , _ = require('lodash')
  , constants = require('./constants.json')
  ;

var dotFile = fs.readFileSync('./mine.dot','utf8');
console.log(dotFile);
var ast = DotParser.parse(dotFile);
var graph = new DotGraph(ast);
graph.walk();
_(graph.nodes).each(function(n,name) { n.name = name});
graph.edgesBySrc = _(graph.edges).values()
                                .flatten(true)
                                .each(function(e) {
                                  e.src = e.edge[0]
                                  e.dest = e.edge[1]
                                })
                                .groupBy('src')
                                .value()
                                ;

//console.log('Nodes',util.inspect(graph.nodes, { depth: 4 } ));
//console.log('Edges',util.inspect(graph.edgesBySrc, { depth: 4 } ));

smearSourcesDownstream(graph);
var tool = process.argv[2];
var site = graph.nodes[process.argv[3]];

console.log(siteRatio(site));
console.log(_.keys(constants.tools).join('\t'));

for(var i=0; i<10; ++i) {
  console.log(_.map(constants.tools,function(p,tool) {
    return sample(tool,site);
  }).join('\t'));
}
console.log('done');

console.log('Nodes',util.inspect(graph.nodes, { depth: 4 } ));

function smearSourcesDownstream(graph) {
  var sourcedNode = _(graph.nodes).filter(function(n) { return n.attrs.srcgold || n.attrs.srcnoise; })
    .each(function(src) {
      smearNodeDownstream(src, {
        gold: src.attrs.srcgold,
        noise: src.attrs.srcnoise
      }, graph);
    })
    ;
}

function smearNodeDownstream(n, smear, graph) {
  n.gold = (n.gold || 0) + smear.gold;
  n.noise = (n.noise || 0) + smear.noise;
  _.each(graph.edgesBySrc[n.name],function(e) {
    var nextSmear = {
      gold: smear.gold * constants.goldFlow,
      noise: smear.noise
    }
    smearNodeDownstream(graph.nodes[e.dest], nextSmear , graph);
  });
}

function siteRatio(node) {
  return (node.gold || 0) / (1.0 * (node.noise || 1));
}

function sample(tool, node) {
  var power = constants.tools[tool];
  if(!power) throw 'Unknown tool ' + tool;
  power *= constants.sampleCoefficient;
  var nuggets = 0;
  var ratio = siteRatio(node);
  for(var i=0; i< power; ++i) {
    var draw = Math.random();
    if(draw <= ratio) nuggets++;
  }
  return nuggets;
}
