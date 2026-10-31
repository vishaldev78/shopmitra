# -*- coding: utf-8 -*-
"""ShopMitra 'Apna App Samjho' guide - ReportLab body generator.

Body PDF (TOC + 12 chapters) -> merged with HTML cover -> final PDF.
"""
import hashlib
import os
import sys

PROJECT = '/home/z/my-project'
SKILL_SCRIPTS = os.path.join(PROJECT, 'skills', 'pdf', 'scripts')
sys.path.insert(0, SKILL_SCRIPTS)
sys.path.insert(0, PROJECT)

os.chdir(PROJECT)

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import inch
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.pdfmetrics import registerFontFamily
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (CondPageBreak, HRFlowable, Image,
                                KeepTogether, PageBreak, Paragraph,
                                SimpleDocTemplate, Spacer, Table, TableStyle)
from reportlab.platypus.tableofcontents import TableOfContents
from PIL import Image as PILImage

from guide_content import CHAPTERS

# ------------------------------------------------------------------ fonts
FONT_DIR = '/usr/share/fonts'
pdfmetrics.registerFont(TTFont('NotoSerifSC', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('NotoSerifSC-Bold', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Bold.ttf'))
# Noto Sans SC static files are absent on this box; the fallback chain only
# needs a registered CJK-capable font, so alias it to Noto Serif SC files.
pdfmetrics.registerFont(TTFont('Noto Sans SC', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('Noto Sans SC Bold', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Bold.ttf'))
pdfmetrics.registerFont(TTFont('SarasaMonoSC', f'{FONT_DIR}/truetype/chinese/SarasaMonoSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('FreeSerif', f'{FONT_DIR}/truetype/freefont/FreeSerif.ttf'))
pdfmetrics.registerFont(TTFont('FreeSerif-Bold', f'{FONT_DIR}/truetype/freefont/FreeSerifBold.ttf'))
pdfmetrics.registerFont(TTFont('FreeSerif-Italic', f'{FONT_DIR}/truetype/freefont/FreeSerifItalic.ttf'))
pdfmetrics.registerFont(TTFont('FreeSerif-BoldItalic', f'{FONT_DIR}/truetype/freefont/FreeSerifBoldItalic.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSans', f'{FONT_DIR}/truetype/dejavu/DejaVuSansMono.ttf'))

registerFontFamily('NotoSerifSC', normal='NotoSerifSC', bold='NotoSerifSC-Bold')
registerFontFamily('Noto Sans SC', normal='Noto Sans SC', bold='Noto Sans SC Bold')
registerFontFamily('FreeSerif', normal='FreeSerif', bold='FreeSerif-Bold',
                   italic='FreeSerif-Italic', boldItalic='FreeSerif-BoldItalic')
registerFontFamily('DejaVuSans', normal='DejaVuSans', bold='DejaVuSans')

from pdf import install_font_fallback  # noqa: E402  (skill helper)
install_font_fallback()

# ------------------------------------------------------------------ palette
# Cascade Palette (palette.cascade --seed 42 --mode minimal)
PAGE_BG       = colors.HexColor('#f5f5f4')
SECTION_BG    = colors.HexColor('#f2f1f0')
CARD_BG       = colors.HexColor('#ebeae8')
TABLE_STRIPE  = colors.HexColor('#ededeb')
HEADER_FILL   = colors.HexColor('#4e4732')
COVER_BLOCK   = colors.HexColor('#746c56')
BORDER        = colors.HexColor('#c5bfac')
ICON          = colors.HexColor('#a48e4b')
ACCENT        = colors.HexColor('#92761f')
ACCENT_2      = colors.HexColor('#3aa0c2')
TEXT_PRIMARY  = colors.HexColor('#151513')
TEXT_MUTED    = colors.HexColor('#7e7c74')

TABLE_HEADER_COLOR = HEADER_FILL
TABLE_HEADER_TEXT  = colors.white
TABLE_ROW_EVEN     = colors.white
TABLE_ROW_ODD      = TABLE_STRIPE

# ------------------------------------------------------------------ layout
MARGIN = 0.9 * inch
PAGE_W, PAGE_H = A4
AVAIL_W = PAGE_W - 2 * MARGIN
AVAIL_H = PAGE_H - 2 * MARGIN
H1_ORPHAN = AVAIL_H * 0.25
MAX_KEEP = PAGE_H * 0.4

DOC_TITLE = 'ShopMitra - Apna App Samjho (Developer Codebase Guide)'
OUT_BODY = 'download/shopmitra-guide-assets/body.pdf'

# ------------------------------------------------------------------ styles
S = {}
S['body'] = ParagraphStyle('Body', fontName='FreeSerif', fontSize=10.5,
                           leading=17, alignment=TA_JUSTIFY,
                           textColor=TEXT_PRIMARY, spaceAfter=10)
S['h1'] = ParagraphStyle('H1', fontName='FreeSerif-Bold', fontSize=19,
                         leading=25, textColor=HEADER_FILL,
                         spaceBefore=18, spaceAfter=4)
S['h2'] = ParagraphStyle('H2', fontName='FreeSerif-Bold', fontSize=13.5,
                         leading=19, textColor=TEXT_PRIMARY,
                         spaceBefore=14, spaceAfter=6)
S['code'] = ParagraphStyle('Code', fontName='DejaVuSans', fontSize=8.3,
                           leading=12.5, alignment=TA_LEFT,
                           textColor=TEXT_PRIMARY)
S['cell'] = ParagraphStyle('Cell', fontName='FreeSerif', fontSize=9.3,
                           leading=13, alignment=TA_LEFT,
                           textColor=TEXT_PRIMARY)
S['cellh'] = ParagraphStyle('CellH', fontName='FreeSerif-Bold', fontSize=9.5,
                            leading=13, alignment=TA_LEFT,
                            textColor=TABLE_HEADER_TEXT)
S['caption'] = ParagraphStyle('Caption', fontName='FreeSerif-Italic', fontSize=8.5,
                              leading=12, alignment=TA_CENTER,
                              textColor=TEXT_MUTED, spaceBefore=3, spaceAfter=6)
S['callout'] = ParagraphStyle('Callout', fontName='FreeSerif', fontSize=10,
                              leading=15.5, alignment=TA_LEFT,
                              textColor=TEXT_PRIMARY)
S['bullet'] = ParagraphStyle('Bullet', fontName='FreeSerif', fontSize=10.5,
                             leading=16.5, alignment=TA_LEFT, leftIndent=16,
                             bulletIndent=4, textColor=TEXT_PRIMARY, spaceAfter=5)
S['toc_title'] = ParagraphStyle('TocTitle', fontName='FreeSerif-Bold', fontSize=19,
                                leading=25, textColor=HEADER_FILL, spaceAfter=14)

TOC_L0 = ParagraphStyle('TOC0', fontName='FreeSerif-Bold', fontSize=11,
                        leading=18, leftIndent=6, textColor=TEXT_PRIMARY)
TOC_L1 = ParagraphStyle('TOC1', fontName='FreeSerif', fontSize=10,
                        leading=15, leftIndent=26, textColor=TEXT_MUTED)


# ------------------------------------------------------------------ doc
class TocDocTemplate(SimpleDocTemplate):
    def afterFlowable(self, flowable):
        if hasattr(flowable, 'bookmark_name'):
            level = getattr(flowable, 'bookmark_level', 0)
            text = getattr(flowable, 'bookmark_text', '')
            key = getattr(flowable, 'bookmark_key', '')
            self.notify('TOCEntry', (level, text, self.page, key))


def on_page(canvas, doc):
    canvas.saveState()
    # header: muted title + accent rule
    canvas.setFont('FreeSerif', 7.5)
    canvas.setFillColor(TEXT_MUTED)
    canvas.drawString(MARGIN, PAGE_H - 0.55 * inch, DOC_TITLE)
    canvas.setStrokeColor(ACCENT)
    canvas.setLineWidth(1.2)
    canvas.line(MARGIN, PAGE_H - 0.62 * inch, PAGE_W - MARGIN, PAGE_H - 0.62 * inch)
    # footer: author + page number
    canvas.setStrokeColor(BORDER)
    canvas.setLineWidth(0.5)
    canvas.line(MARGIN, 0.62 * inch, PAGE_W - MARGIN, 0.62 * inch)
    canvas.setFont('FreeSerif', 7.5)
    canvas.setFillColor(TEXT_MUTED)
    canvas.drawString(MARGIN, 0.45 * inch, 'ShopMitra Developer Edition')
    canvas.drawRightString(PAGE_W - MARGIN, 0.45 * inch, str(doc.page))
    canvas.restoreState()


def esc(text):
    return text.replace('&', '&').replace('<', '<').replace('>', '>')


def safe_keep_together(elements):
    total_h = 0
    for el in elements:
        w, h = el.wrap(AVAIL_W, PAGE_H)
        total_h += h
    if total_h <= MAX_KEEP:
        return [KeepTogether(elements)]
    if len(elements) >= 2:
        return [KeepTogether(elements[:2])] + list(elements[2:])
    return list(elements)


def add_heading(text, style, level=0):
    key = 'h_%s' % hashlib.md5(text.encode()).hexdigest()[:8]
    p = Paragraph('<a name="%s"/><b>%s</b>' % (key, text), style)
    p.bookmark_name = key
    p.bookmark_level = level
    p.bookmark_text = text
    p.bookmark_key = key
    return p


def make_table(headers, rows, ratios):
    col_widths = [r * AVAIL_W * 0.97 for r in ratios]
    assert sum(col_widths) <= AVAIL_W + 0.5
    data = [[Paragraph('<b>%s</b>' % h, S['cellh']) for h in headers]]
    for row in rows:
        data.append([Paragraph(c, S['cell']) for c in row])
    t = Table(data, colWidths=col_widths, repeatRows=1, hAlign='CENTER')
    style = [
        ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('LEFTPADDING', (0, 0), (-1, -1), 7),
        ('RIGHTPADDING', (0, 0), (-1, -1), 7),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]
    for i in range(1, len(data)):
        style.append(('BACKGROUND', (0, i), (-1, i),
                      TABLE_ROW_ODD if i % 2 else TABLE_ROW_EVEN))
    t.setStyle(TableStyle(style))
    return t


def code_box(lines):
    html = '<br/>'.join(esc(ln).replace(' ', '\u00A0') for ln in lines)
    inner = Paragraph(html, S['code'])
    t = Table([[inner]], colWidths=[AVAIL_W * 0.97], hAlign='CENTER')
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), CARD_BG),
        ('LINEBEFORE', (0, 0), (0, -1), 3, ACCENT),
        ('TOPPADDING', (0, 0), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 9),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
    ]))
    return t


def callout_box(text):
    inner = Paragraph(text, S['callout'])
    t = Table([[inner]], colWidths=[AVAIL_W * 0.97], hAlign='CENTER')
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), SECTION_BG),
        ('LINEBEFORE', (0, 0), (0, -1), 4, ACCENT),
        ('TOPPADDING', (0, 0), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 9),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 12),
    ]))
    return t


def embed_image(path, max_width=None, max_height=None):
    if max_width is None:
        max_width = AVAIL_W
    if max_height is None:
        max_height = PAGE_H * 0.35
    pil = PILImage.open(path)
    ow, oh = pil.size
    ratio = min(max_width / ow if ow > max_width else 1.0,
                max_height / oh if oh > max_height else 1.0)
    return Image(path, width=ow * ratio, height=oh * ratio)


# ------------------------------------------------------------------ story
story = []

toc = TableOfContents()
toc.levelStyles = [TOC_L0, TOC_L1]
story.append(Paragraph('<b>Vishay Suchi (Table of Contents)</b>', S['toc_title']))
story.append(HRFlowable(width='100%', color=ACCENT, thickness=1.2,
                        spaceBefore=0, spaceAfter=10))
story.append(toc)
story.append(PageBreak())

chapter_no = 0
pending_h1 = None  # heading block waiting to be kept with next flowable

def flush_h1(first_block):
    """KeepTogether: chapter heading + accent rule + first content block."""
    global pending_h1
    if pending_h1 is None:
        return [first_block]
    group = pending_h1 + [first_block]
    pending_h1 = None
    return safe_keep_together(group)

for block in CHAPTERS:
    kind = block[0]
    if kind == 'h1':
        chapter_no += 1
        title = '%d. %s' % (chapter_no, block[1])
        pending_h1 = [
            CondPageBreak(H1_ORPHAN),
            add_heading(title, S['h1'], level=0),
            HRFlowable(width='100%', color=ACCENT, thickness=1.2,
                       spaceBefore=0, spaceAfter=10),
        ]
    elif kind == 'h2':
        h = add_heading(block[1], S['h2'], level=1)
        for fl in flush_h1(h):
            story.append(fl)
        pending_h1 = None
    elif kind == 'body':
        p = Paragraph(block[1], S['body'])
        for fl in flush_h1(p):
            story.append(fl)
        pending_h1 = None
    elif kind == 'bullets':
        items = [Paragraph(it, S['bullet'], bulletText='\u2022') for it in block[1]]
        for i, fl in enumerate(flush_h1(items[0])):
            story.append(fl)
        story.extend(items[1:])
        pending_h1 = None
    elif kind == 'numbered':
        items = [Paragraph(it, S['bullet'], bulletText='%d.' % (i + 1))
                 for i, it in enumerate(block[1])]
        for i, fl in enumerate(flush_h1(items[0])):
            story.append(fl)
        story.extend(items[1:])
        pending_h1 = None
    elif kind == 'table':
        _, caption, headers, rows, ratios = block
        t = make_table(headers, rows, ratios)
        cap = Paragraph(caption, S['caption'])
        group = [Spacer(1, 8), t, cap]
        if len(rows) <= 15:
            for fl in flush_h1(group[0]):
                story.append(fl)
            story.extend(group[1:])
        else:
            for fl in flush_h1(group[0]):
                story.append(fl)
            story.append(t)
            story.append(cap)
        pending_h1 = None
        story.append(Spacer(1, 6))
    elif kind == 'code':
        cb = code_box(block[1])
        for fl in flush_h1(cb):
            story.append(fl)
        pending_h1 = None
        story.append(Spacer(1, 10))
    elif kind == 'callout':
        cb = callout_box(block[1])
        for fl in flush_h1(cb):
            story.append(fl)
        pending_h1 = None
        story.append(Spacer(1, 10))
    elif kind == 'img':
        _, path, caption, max_h = block
        img = embed_image(path, max_width=AVAIL_W * 0.98, max_height=max_h)
        cap = Paragraph(caption, S['caption'])
        for fl in flush_h1(Spacer(1, 6)):
            story.append(fl)
        story.extend(safe_keep_together([img, cap]))
        pending_h1 = None
        story.append(Spacer(1, 8))

doc = TocDocTemplate(
    OUT_BODY, pagesize=A4,
    leftMargin=MARGIN, rightMargin=MARGIN,
    topMargin=MARGIN, bottomMargin=MARGIN,
    title=DOC_TITLE,
    subject='Beginner Hinglish guide to the ShopMitra codebase',
)
doc.multiBuild(story, onFirstPage=on_page, onLaterPages=on_page)
print('body pages:', doc.page)

# ------------------------------------------------------------------ merge cover
from pypdf import PdfReader, PdfWriter  # noqa: E402

A4_W, A4_H = 595.28, 841.89
COVER = 'download/shopmitra-guide-assets/cover.pdf'
FINAL = 'download/ShopMitra_Apna_App_Samjho_Guide.pdf'


def normalize(page):
    w, h = float(page.mediabox.width), float(page.mediabox.height)
    if abs(w - A4_W) > 0.1 or abs(h - A4_H) > 0.1:
        page.scale_to(A4_W, A4_H)
    return page


writer = PdfWriter()
writer.add_page(normalize(PdfReader(COVER).pages[0]))
for page in PdfReader(OUT_BODY).pages:
    writer.add_page(normalize(page))
writer.add_metadata({'/Title': DOC_TITLE,
                     '/Subject': 'Beginner Hinglish guide to the ShopMitra codebase'})
with open(FINAL, 'wb') as f:
    writer.write(f)
print('final:', FINAL, os.path.getsize(FINAL) // 1024, 'KB')
