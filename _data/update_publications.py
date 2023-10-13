import bibtexparser
from pylatexenc.latex2text import LatexNodes2Text
import yaml

input_path = "./publications.bib"
output_path = "./publications.yml"

with open(input_path) as input_file:
    lt = LatexNodes2Text()
    db = bibtexparser.load(input_file)
    for e in db.entries:
        for k, v in e.items():
            e[k] = lt.latex_to_text(v)

    with open(output_path, 'w') as output_file:
        yaml.dump(db.entries, output_file, allow_unicode=True)
