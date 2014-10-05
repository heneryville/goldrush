var DotParser = require('./dot-parser')
  , DotGraph = require('./dot-graph')
  , fs = require('fs')
  , util = require('util')
  , _ = require('lodash')
  , constants = require('./constants.json')
 ;

module.exports = function Game(file) {
  var self = this;
  var graph = parse(file);
  smearSourcesDownstream(graph);
  for(var i=0; i<constants.settleIterations; ++i) simulate();

  return {
    simulate: simulate,
    sample: sample,
    stock: stock,
    survey: survey,
    report: report,
    get: get
  }

  function get(nodeName) {
    var node = graph.nodes[nodeName];
    if(!node) throw 'Unknown site: ' + nodeName;
    return node.gold;
  }

  function stock(nodeName,cnt) {
    var node = graph.nodes[nodeName];
    if(!node) throw 'Unknown site: ' + nodeName;
    console.log(node.gold, cnt);
    node.gold += cnt;
  }

  function survey(nodeName) {
    var node = graph.nodes[nodeName];
    if(!node) throw 'Unknown site: ' + nodeName;
    console.log(_.keys(constants.tools).join('\t'));
    _.times(1,function() {
      console.log(_.map(_.keys(constants.tools),function(tool){
        var nuggets = sample(nodeName,tool);
        //Put the nuggets back
        node.gold += nuggets;
        return nuggets;
      }).join('\t'));
    })
  }

  function sample(nodeName, toolName) {
    var node = graph.nodes[nodeName];
    var tool = constants.tools[toolName];
    if(!node) throw 'Unknown site: ' + nodeName;
    if(!tool) throw 'Unknown tool: ' + toolName;
    var samples = tool * constants.coef.sample;
    var nuggets = 0;

    for(var i=0; i<samples; i++) {
      var findingRatio = node.gold / node.noise;
      if(Math.random() < findingRatio) {
        node.gold--;
        nuggets++;
      }
    }
    return nuggets;
  }

  function report() {
    console.log('Nodes',util.inspect(graph.nodes, { depth: 4 } ));
  }

  function simulate() {
    _(graph.nodes).each(function(node) { node.ngold = 0; });
    _(graph.nodes).each(function(node) {
        var children = graph.edgesBySrc[node.name] || [];
        if(children.length == 0) return;
        var goldLost = (node.gold || 0) * constants.coef.flow;
        node.gold = (node.gold || 0) +  (node.attrs.srcgold || 0) * constants.coef.gold -  goldLost;
        var toEach = goldLost / children.length;
        _.each(children,function(edge) {
          var dest = graph.nodes[edge.dest];
          //console.log(node.name,'giving ',toEach,'to', dest.name);
          dest.ngold += toEach;
        });
      });
    _(graph.nodes).each(function(node) {
      node.gold = (node.gold || 0) + (node.ngold || 0);
    });
  }

  function smearSourcesDownstream(graph) {
    var sourcedNode = _(graph.nodes).filter(function(n) { return n.attrs.srcnoise; })
      .each(function(src) {
        smearNodeDownstream(src, src.attrs.srcnoise * constants.coef.noise, graph);
      })
      ;
  }

  function smearNodeDownstream(n, smear, graph) {
    n.noise = (n.noise || 0) + smear;
    _.each(graph.edgesBySrc[n.name],function(e) {
      smearNodeDownstream(graph.nodes[e.dest], smear , graph);
    });
  }


}

function parse(file) {
  var dotFile = fs.readFileSync(file,'utf8');
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
  return graph;
}
