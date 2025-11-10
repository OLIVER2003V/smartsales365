# ventas/pdf_utils.py
import io
from django.utils.dateformat import DateFormat
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_RIGHT, TA_CENTER

def format_price(price):
    """Formatea un número como moneda Boliviana (Bs.)"""
    return f"Bs {price:,.2f}"

def generar_comprobante_pdf(venta):
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter,
                            rightMargin=0.75*inch, leftMargin=0.75*inch,
                            topMargin=0.75*inch, bottomMargin=0.75*inch)
    
    story = []
    styles = getSampleStyleSheet()
    
    # Estilo para los códigos de garantía
    style_normal = styles['Normal']
    style_small_grey = ParagraphStyle(
        'small_grey',
        parent=style_normal,
        fontSize=7.5,
        textColor=colors.darkgrey
    )

    # 1. Título y Datos de la Empresa
    story.append(Paragraph("SmartSales365", styles['h1']))
    story.append(Paragraph("NIT: 123456789", styles['Normal']))
    story.append(Paragraph("Av. Siempre Viva #123, Santa Cruz, Bolivia", styles['Normal']))
    story.append(Paragraph("Tel: +591 3 333-3333", styles['Normal']))
    story.append(Spacer(1, 0.25*inch))
    
    # 2. Título del Documento
    title_style = styles['h2']
    title_style.alignment = TA_CENTER
    story.append(Paragraph(f"COMPROBANTE DE VENTA #{venta.id}", title_style))
    story.append(Spacer(1, 0.25*inch))

    # 3. Información del Cliente y Venta
    fecha_formateada = DateFormat(venta.fecha_venta).format('d \d\e F \d\e Y, H:i')
    
    cliente_data = [
        ["Cliente:", f"{venta.cliente.nombre} {venta.cliente.apellido}"],
        ["Email:", venta.cliente.email],
        ["NIT/CI:", venta.cliente.nit_ci or "No especificado"],
        ["Fecha de Venta:", fecha_formateada],
        ["Estado Pedido:", venta.get_estado_display()], # Muestra el estado del pedido
    ]
    if venta.vendedor:
         cliente_data.append(["Atendido por:", venta.vendedor.username])

    cliente_table = Table(cliente_data, colWidths=[1.5*inch, 5.5*inch])
    cliente_table.setStyle(TableStyle([
        ('FONTNAME', (0,0), (0,-1), 'Helvetica-Bold'),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
    ]))
    story.append(cliente_table)
    story.append(Spacer(1, 0.3*inch))

    # 4. Tabla de Detalles de la Venta (CON GARANTÍAS)
    detalles_data = [
        ["Cant.", "Descripción / Códigos de Garantía", "P. Unitario", "Subtotal"]
    ]
    
    # La vista debe hacer prefetch de 'detalles__garantias'
    for detalle in venta.detalles.all():
        
        garantias_detalle = detalle.garantias.all()
        
        desc_principal = Paragraph(detalle.producto.nombre, style_normal)
        celda_descripcion = [desc_principal]

        if garantias_detalle:
            vencimiento = DateFormat(garantias_detalle[0].fecha_vencimiento).format('d/m/Y')
            # Muestra los primeros 8 caracteres de cada UUID
            codigos_str = ", ".join([str(g.codigo_garantia)[:8] for g in garantias_detalle])
            
            celda_descripcion.append(Spacer(1, 4)) 
            celda_descripcion.append(Paragraph(
                f"<i>Garantía vence: {vencimiento}</i><br/>Códigos: {codigos_str}...",
                style_small_grey
            ))

        detalles_data.append([
            detalle.cantidad,
            celda_descripcion, # Se pasa la lista de Párrafos
            format_price(detalle.precio_unitario),
            format_price(detalle.subtotal)
        ])
    
    detalles_table = Table(detalles_data, colWidths=[0.7*inch, 4.1*inch, 1.35*inch, 1.35*inch])
    
    detalles_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#4A90E2")), 
        ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
        ('ALIGN', (0,0), (-1,0), 'CENTER'), 
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,0), 10),
        ('BOTTOMPADDING', (0,0), (-1,0), 8),
        ('FONTNAME', (0,1), (-1,-1), 'Helvetica'),
        ('FONTSIZE', (0,1), (-1,-1), 9),
        ('ALIGN', (0,1), (0,-1), 'CENTER'),      
        ('ALIGN', (2,1), (3,-1), 'RIGHT'),     
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('GRID', (0,0), (-1,-1), 1, colors.black), 
        ('BOX', (0,0), (-1,-1), 1, colors.black),
    ]))
    
    story.append(detalles_table)
    story.append(Spacer(1, 0.2*inch))

    # 5. Total
    total_data = [["TOTAL:", format_price(venta.total)]]
    total_table = Table(total_data, colWidths=[5.45*inch, 1.35*inch]) 
    total_table.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'RIGHT'),
        ('FONTNAME', (0,0), (-1,-1), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-1), 12),
    ]))
    story.append(total_table)
    story.append(Spacer(1, 0.5*inch))

    # 6. Pie de página
    story.append(Paragraph("Gracias por su compra. Conserve este comprobante para su garantía.", styles['Normal']))
    story.append(Paragraph("Consulte el estado de su garantía en www.smartsales365.com/consultar-garantia", styles['Normal']))
    
    doc.build(story)
    
    buffer.seek(0)
    return buffer