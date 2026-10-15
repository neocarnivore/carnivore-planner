param([ValidateSet('dev','build','test','sync')][string]$Task='dev')
$ErrorActionPreference='Stop'
Set-Location $PSScriptRoot
$nodeExe=(Get-Command node -ErrorAction SilentlyContinue).Source
if(-not $nodeExe){
  $bundledNode=Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe'
  if(Test-Path -LiteralPath $bundledNode){$nodeExe=$bundledNode}else{throw 'Install Node.js 22 or newer.'}
}
$env:PATH="$(Split-Path $nodeExe);$env:PATH"
$cacheDir=Join-Path $env:LOCALAPPDATA 'CarnivorePlanner/npm-12.2.0'
$npmCli=Join-Path $cacheDir 'package/bin/npm-cli.js'
if(-not(Test-Path -LiteralPath $npmCli)){
  New-Item -ItemType Directory -Force $cacheDir | Out-Null
  $env:PLANNER_NPM_CACHE=$cacheDir
  & $nodeExe scripts/bootstrap-npm.mjs
  if($LASTEXITCODE -ne 0){throw 'npm download failed.'}
  tar -xzf (Join-Path $cacheDir 'npm.tgz') -C $cacheDir
  if($LASTEXITCODE -ne 0){throw 'npm extraction failed.'}
}
$env:PATH="$(Join-Path $cacheDir 'package/bin');$env:PATH"
if(-not(Test-Path 'node_modules')){& $nodeExe $npmCli ci --registry=https://registry.npmjs.org;if($LASTEXITCODE -ne 0){throw 'Dependency install failed.'}}
if($Task -in @('dev','build','sync')){& $nodeExe $npmCli run build;if($LASTEXITCODE -ne 0){throw 'Build failed.'}}
switch($Task){
  'dev' { & $nodeExe $npmCli run dev }
  'test' { & $nodeExe node_modules/playwright/cli.js install chromium; if($LASTEXITCODE -ne 0){throw 'Browser download failed.'}; & $nodeExe $npmCli test }
  'sync' { & $nodeExe $npmCli run ios:sync }
}
if($LASTEXITCODE -ne 0){throw 'Task failed.'}
