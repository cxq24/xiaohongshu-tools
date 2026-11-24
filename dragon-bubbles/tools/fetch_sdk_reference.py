"""Extract a hash-pinned public JS SDK fixture; never included in the game ZIP."""
from pathlib import Path
import json,hashlib,urllib.request,tarfile,io,subprocess,tempfile
R=Path(__file__).resolve().parents[1];meta=json.loads((R/'tools/xhs-sdk-provenance.json').read_text());out=Path(tempfile.gettempdir())/'apu-xhs-sdk-0.7.1.js'
if out.exists() and hashlib.sha256(out.read_bytes()).hexdigest()==meta['sdk_sha256']:
 print(out);raise SystemExit(0)
with urllib.request.urlopen(meta['archive_url'],timeout=45) as response:raw=response.read()
assert hashlib.sha256(raw).hexdigest()==meta['archive_sha256']
with tarfile.open(fileobj=io.BytesIO(raw),mode='r:gz') as archive:source=archive.extractfile('package/lib/index.js').read()
script="""const fs=require('node:fs'),acorn=require('./tools/bundler/node_modules/acorn');const ast=acorn.parse(fs.readFileSync(0,'utf8'),{ecmaVersion:'latest',sourceType:'module'});let sdk;function visit(n){if(!n||typeof n!=='object')return;if(n.type==='VariableDeclarator'&&n.init?.type==='Literal'&&typeof n.init.value==='string'&&n.init.value.includes('xhs-script-version=0.7.1'))sdk=n.init.value;for(const v of Object.values(n)){if(Array.isArray(v))v.forEach(visit);else if(v&&typeof v==='object')visit(v);}}visit(ast);if(!sdk)throw Error('SDK reference missing');process.stdout.write(sdk);"""
sdk=subprocess.check_output(['node','-e',script],input=source,cwd=R)
assert hashlib.sha256(sdk).hexdigest()==meta['sdk_sha256'];out.write_bytes(sdk);print(out)
