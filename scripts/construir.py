"""Genera jugadores.js: futbolistas que han jugado en al menos dos de los clubes del grid (Wikidata).

Uso: python scripts/construir.py   (Wikidata permite pocas consultas seguidas: si da 429, espera un minuto)
"""
import json, os, urllib.request, urllib.parse

CLUBES = {
    "Q8682": "Real Madrid", "Q7156": "Barcelona", "Q8701": "Atlético", "Q10329": "Sevilla", "Q10333": "Valencia",
    "Q8723": "Betis", "Q12297": "Villarreal", "Q8687": "Athletic", "Q10315": "Real Sociedad", "Q8749": "Celta",
    "Q10308": "Zaragoza", "Q8806": "Getafe", "Q10286": "Osasuna", "Q8835": "Mallorca", "Q10300": "Rayo Vallecano",
    "Q10319": "Valladolid", "Q8823": "Levante",
}
CONSULTA = """SELECT ?j ?jLabel ?club WHERE {
  VALUES ?club { %s }
  ?j p:P54 ?st. ?st ps:P54 ?club. ?j wdt:P31 wd:Q5.
  SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en". }
}""" % " ".join("wd:" + q for q in CLUBES)


def main():
    url = "https://query.wikidata.org/sparql?format=json&query=" + urllib.parse.quote(CONSULTA)
    req = urllib.request.Request(url, headers={"User-Agent": "grid-laliga/1.0 (adrianezd)", "Accept": "application/sparql-results+json"})
    filas = json.loads(urllib.request.urlopen(req, timeout=300).read().decode("utf-8"))["results"]["bindings"]
    jug = {}
    for f in filas:
        qid = f["j"]["value"].rsplit("/", 1)[1]
        nombre = f["jLabel"]["value"]
        if nombre == qid:
            continue  # sin nombre en español ni inglés
        j = jug.setdefault(qid, {"n": nombre, "c": set()})
        j["c"].add(f["club"]["value"].rsplit("/", 1)[1])
    ids = list(CLUBES)
    salida = [{"n": j["n"], "c": sorted(ids.index(c) for c in j["c"])} for j in jug.values() if len(j["c"]) >= 2]
    salida.sort(key=lambda j: j["n"])
    ruta = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "jugadores.js")
    with open(ruta, "w", encoding="utf-8") as f:
        f.write("// Generado por scripts/construir.py con datos de Wikidata (CC0).\n")
        f.write("var CLUBES = " + json.dumps([CLUBES[q] for q in ids], ensure_ascii=False) + ";\n")
        f.write("var JUGADORES = " + json.dumps(salida, ensure_ascii=False, separators=(",", ":")) + ";\n")
    print(len(filas), "filas,", len(salida), "jugadores con 2 clubes o más")


if __name__ == "__main__":
    main()
