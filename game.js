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
  for(var i=0; i<constants.settleIterations; ++i) simulate(true);

  return {
    simulate: simulate.bind(self,false),
    sample: sample.bind(self,graph),
    stock: stock,
    survey: survey,
    report: report,
    get: get
  }

  function get(nodeName) {
    var node = graph.nodes[nodeName];
    if(!node) throw 'Unknown site: ' + nodeName;
    return node;
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
    _.times(10,function() {
      console.log(_.map(_.keys(constants.tools),function(tool){
        var g = _.clone(graph,true);
        var nuggets = sample(g,nodeName,tool);
        return nuggets;
      }).join('\t'));
    })
  }

  function isVeinTool(tool) {
    return tool == 'shaft' || tool == 'hydro';
  }

  function sample(graph,nodeName, toolName) {
    var veinTool = isVeinTool(toolName);
    var node = graph.nodes[nodeName];
    var tool = constants.tools[toolName];
    if(!node) throw 'Unknown site: ' + nodeName;
    if(!tool) throw 'Unknown tool: ' + toolName;
    var samples = tool * constants.coef.sample;
    var nuggets = 0;
    var findingRatio = getRatio(node, veinTool);
    //console.log(toolName,'@',nodeName,findingRatio)

    for(var i=0; i<samples; i++) {
      var findingRatio = getRatio(node, veinTool);
      if(Math.random() < findingRatio) {
        if(veinTool)
          node.goldVein--;
        else
          node.gold--;
        nuggets++;
      }
    }
    return nuggets;
  }

  function getRatio(node, veinTool) {
    if(veinTool)
       return node.goldVein / (node.goldVein + node.noise)
     return node.gold / (node.gold + node.noise)
  }

  function report() {
    console.log('Nodes',util.inspect(graph.nodes, { depth: 4 } ));
  }

  function simulate(flowGold) {
    _(graph.nodes).each(function(node) { node.ngold = 0; });
    _(graph.nodes).each(function(node) {
        var children = graph.edgesBySrc[node.name] || [];
        if(children.length == 0) return;
        var goldLost = (node.gold || 0) * constants.coef.flow;
        node.gold = (node.gold || 0) +  (node.attrs.srcgold || 0) * constants.coef.goldErrosion -  goldLost;
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
  _(graph.nodes)
    .filter(function(n){ return n.attrs.srcgold;})
    .each(function(n) {
      n.goldVein = n.attrs.srcgold * constants.coef.goldVein * _.sample(constants.coef.goldEndurance);
    })

                                  /*
  _(graph.nodes)
  .filter(function(n){ return n.attrs.rock;})
  .shuffle().each(function(n) {
    n.attrs.srcgold = _.shuffle([15,9,8,8,7,7,6,5,5,6,4,4,4,4,,3,3,2,1,0,2,2,2,2,2,2,,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0])
  })
  */
  return graph;
}
