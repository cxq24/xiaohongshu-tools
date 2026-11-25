"""Regression for the exact directory rules reported by TapTap's upload console."""
from io import BytesIO
from zipfile import ZipFile
from build import validate_upload_archive

cases=[
 ('one-folder',{'game/index.html':b'entry','game/app.js':b'code'},True),
 ('flat-rejected',{'index.html':b'entry','app.js':b'code'},False),
 ('two-folders-rejected',{'game/index.html':b'entry','extra/a.js':b'code'},False),
 ('loose-root-file-rejected',{'game/index.html':b'entry','README.md':b'note'},False),
 ('nested-index-rejected',{'game/sub/index.html':b'entry'},False),
]
for name,files,expected in cases:
 data=BytesIO()
 with ZipFile(data,'w') as z:
  for path,raw in files.items():z.writestr(path,raw)
 with ZipFile(data) as z:
  try:validate_upload_archive(z);actual=True
  except AssertionError:actual=False
 assert actual==expected,name
print('PASS: single-folder accepted; flat, multiple roots, loose files and overly nested entry rejected.')
