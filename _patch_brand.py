from pathlib import Path

root = Path(__file__).resolve().parent
old_logo = (
    '          <span class="logo__mark"><i data-lucide="search"></i></span>\n'
    "          FINDIT"
)
new_logo = (
    '          <span class="logo__mark"><i data-lucide="search"></i></span>\n'
    '          <span class="logo__text">\n'
    "            <strong>FINDIT</strong>\n"
    "            <small>Holy Cross of Davao College</small>\n"
    "          </span>"
)
old_stripe = '  <body>\n    <header class="site-header">'
new_stripe = (
    "  <body>\n"
    '    <div class="brand-stripe" aria-hidden="true"></div>\n'
    '    <header class="site-header">'
)

for path in root.glob("*.html"):
    text = path.read_text(encoding="utf-8")
    original = text
    if "\r\n" in text:
        text = text.replace(old_logo.replace("\n", "\r\n"), new_logo.replace("\n", "\r\n"))
        text = text.replace(old_stripe.replace("\n", "\r\n"), new_stripe.replace("\n", "\r\n"))
    else:
        text = text.replace(old_logo, new_logo)
        text = text.replace(old_stripe, new_stripe)
    if text != original:
        path.write_text(text, encoding="utf-8")
        print("updated", path.name)
    else:
        print("no change", path.name)
