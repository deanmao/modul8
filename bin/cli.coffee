#!/usr/bin/env coffee

# Module dependencies

fs      = require('fs')
program = require('commander')
path    = require('path')
modul8  = require('../')
dir     = fs.realpathSync()
{basename, dirname, resolve, join} = path

# options

program
  .version(modul8.version)
  .usage('entrypointpath [options]')
  .option('-z, --analyze', 'analyze dependencies instead of compiling')
  .option('-p, --domains <name:path>,..', 'specify require domains')
  .option('-d, --data <key:path>,..', 'attach json parsed data from path to data::key')
  .option('-a, --arbiters <shortcut:glob.glob2>,...', 'specify arbiters to be added to compiled file for deleted globals')

  .option('-n, --namespace <str>', 'specify the target namespace used in the compiled file')

  .option('-t, --testcut', 'enable pre-processing of files to cut out local tests and their dependencies')
  .option('-m, --minify', 'enable uglifyjs post processing')
  .option('-l, --logging', 'enable logging of requires')

program.on '--help', ->
  console.log('  Examples:')
  console.log('')
  console.log('    # compile application from entry point')
  console.log('    $ modul8 app/entry.js > output.js')
  console.log('')
  console.log('    # analyze application dependencies from entry point')
  console.log('    $ modul8 app/entry.js -z')
  console.log('')
  console.log('    # specify domains manually')
  console.log('    $ modul8 app/entry.js -p shared:shared/,bot:bot/')
  console.log('')
  console.log('    # specify arbiters')
  console.log('    $ modul8 app/entry.js -a jQuery:$.jQuery,Spine:Spine')
  console.log('')


program.parse(process.argv);

# simple options
namespace = program.namespace ? 'M8'
logging = !!program.logging
analyze = !!program.analyze
i_d = (a) -> a
testcutter = if program.testcut then modul8.testcutter else i_d
minifier = if program.minify then modul8.minifier else i_d

#parse domains (if none, only app domain code)
domains = {}
for p in (program.domains?.split(',') or [])
  [n,d] = p.split(':')
  d = join(dir, d)
  domains[n] = d

# parse mediators
arbiters = {}
for m in (program.arbiters?.split(',') or [])
  [key, vals] = m.split(':')
  arbiters[key] = vals?.split('.') or [key]

# load data
loader = (pathSafe) ->
  -> fs.readFileSync(pathSafe, 'utf8')

data = {}
for d in (program.data?.split(',') or [])
  [key, p] = d.split(':')
  if not p or not path.existsSync p
    console.error("invalid data usage: key:pathtofile")
    process.exit()
  data[key] = loader(p)


# first arg is entry
entry = program.args[0]
epath = join(dir, entry)
efile = entry.split('/')[-1...][0] # get last element of split

appdom = epath.split(efile)[0]
as = appdom.split('/')
as.pop() if as[as.length-1] is ''
appname = as[as.length-1]

if not path.existsSync epath
  console.error("requires an entry point as first argument")
  process.exit()


modul8(efile)
  .domains()
    .add(appname, appdom)
  .domains(domains)
  .data(data)
  .analysis()
    .output(if analyze then console.log else false)
  .arbiters(arbiters)
  .set('namespace', namespace)
  .set('logging', logging)
  .before(testcutter)
  .after(minifier)
  .compile(if analyze then null else console.log)

#TODO: domloader interface?
