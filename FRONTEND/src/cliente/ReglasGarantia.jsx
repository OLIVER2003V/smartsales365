// src/cliente/ReglasGarantia.jsx
import React from 'react';
import { ShieldCheck, BookOpen, AlertTriangle, Workflow } from 'lucide-react'; // ✨ Importado Workflow
import { Link } from 'react-router-dom';

// Nota: Este componente se ve mejor con el plugin de Tailwind CSS:
// npm install -D @tailwindcss/typography
// Y luego añadir 'require('@tailwindcss/typography')' a tus plugins en tailwind.config.js

const ReglasGarantia = () => {
    return (
        // ✨ MEJORA: Paleta slate
        <div className="min-h-screen bg-slate-100 p-4 md:p-8">
            <div className="max-w-3xl mx-auto bg-white p-8 md:p-12 rounded-xl shadow-xl border border-slate-200">
                
                {/* Encabezado */}
                <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-200">
                    {/* ✨ MEJORA: Color indigo */}
                    <ShieldCheck size={40} className="text-indigo-600" strokeWidth={2} />
                    {/* ✨ MEJORA: font-bold y tracking-tight */}
                    <h1 className="text-4xl font-bold text-slate-900 tracking-tight">
                        Reglas de Garantía
                    </h1>
                </div>

                {/* --- Contenido de Texto --- 
                    ✨ MEJORA: 'prose' ajustado con nuestros colores.
                    - prose-slate: Cambia el color base del texto.
                    - prose-headings: Estiliza h1, h2, h3...
                    - prose-a: Estiliza los enlaces.
                    - prose-strong: Estiliza el texto en negrita.
                */}
                <div className="prose prose-lg max-w-none 
                                prose-slate 
                                prose-headings:text-slate-900 prose-headings:font-semibold
                                prose-a:text-indigo-600 prose-a:font-medium hover:prose-a:text-indigo-800
                                prose-strong:text-slate-900
                                prose-li:my-1"
                >
                    <p>
                        Bienvenido a la política de garantía de SmartSales365. Nos comprometemos a ofrecer productos de alta calidad y un servicio postventa confiable.
                    </p>
                    
                    {/* ✨ MEJORA: Iconos alineados con el color del título */}
                    <h2 className="flex items-center gap-2.5">
                        <BookOpen size={22} className="text-slate-900" strokeWidth={2.5} /> 
                        1. Cobertura General
                    </h2>
                    <p>
                        Todos los productos vendidos por SmartSales365 están cubiertos por una garantía estándar contra defectos de fabricación. El período de garantía se especifica en la descripción de cada producto (ej. 12, 24 meses) y comienza en la <strong>fecha de la compra</strong>, tal como figura en su comprobante.
                    </p>
                    
                    <h2 className="flex items-center gap-2.5">
                        <AlertTriangle size={22} className="text-slate-900" strokeWidth={2.5} /> 
                        2. Exclusiones de la Garantía
                    </h2>
                    <p>
                        Esta garantía no cubre:
                    </p>
                    <ul>
                        <li>Daños causados por mal uso, negligencia, accidentes o desastres naturales.</li>
                        <li>Daños causados por sobrevoltajes eléctricos o fluctuaciones de energía.</li>
                        <li>Productos que hayan sido abiertos, reparados o modificados por personal no autorizado.</li>
                        <li>Desgaste normal del producto (ej. baterías, filtros).</li>
                        <li>Daños cosméticos (rayones, abolladuras) que no afecten la funcionalidad.</li>
                    </ul>

                    <h2 className="flex items-center gap-2.5">
                        <Workflow size={22} className="text-slate-900" strokeWidth={2.5} /> 
                        3. Cómo Reclamar su Garantía
                    </h2>
                    <p>
                        Para hacer un reclamo, siga estos pasos:
                    </p>
                    <ol>
                        <li>
                            <strong>Verifique su Código:</strong> Use nuestra página de{' '}
                            <Link to="/consultar-garantia">Consulta de Garantía</Link>
                            {' '}para verificar que su producto esté dentro del período de cobertura y que la garantía esté "Activa".
                        </li>
                        <li>
                            <strong>Contacte a Soporte:</strong> Envíe un correo a <a href="mailto:soporte@smartsales365.com">soporte@smartsales365.com</a> con su código de garantía, el comprobante de compra (PDF) y una descripción del problema.
                        </li>
                        <li>
                            <strong>Evaluación:</strong> Nuestro equipo técnico evaluará el caso. Es posible que se le solicite enviar el producto a nuestro centro de servicio.
                        </li>
                    </ol>

                    <h2>4. Resolución</h2>
                    <p>
                        Una vez aprobado el reclamo, SmartSales365 se reserva el derecho de:
                    </p>
                    <ul>
                        <li>Reparar el producto defectuoso.</li>
                        <li>Reemplazar el producto por una unidad nueva o reacondicionada equivalente.</li>
                        <li>Emitir una nota de crédito por el valor del producto, si la reparación o reemplazo no es posible.</li>
                    </ul>
                </div>

            </div>
        </div>
    );
};

export default ReglasGarantia;