// src/components/Navbar.jsx
import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom'; // ✨ IMPORTANTE: NavLink para estilos 'active'
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { 
    User, 
    ShoppingCart, 
    LogOut, 
    LayoutDashboard, 
    Settings, 
    ChevronDown,
    Users,
    Package,
    History,
    BarChart3,
    Bookmark,
    Truck,
    TicketPercent,
    MessageSquare,
    ShoppingBag,
    ShieldCheck,
    Heart,
} from 'lucide-react'; // ✨ Iconos de Lucide

// --- Componente de Enlace de Navegación ---
// Usa NavLink para obtener 'isActive' y aplicar un estilo activo
const NavItem = ({ to, children }) => {
    const baseStyle = "text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors relative";
    const activeStyle = "text-indigo-600 after:content-[''] after:absolute after:-bottom-1 after:left-0 after:right-0 after:h-0.5 after:bg-indigo-600";
    
    return (
        <NavLink 
            to={to}
            className={({ isActive }) => `${baseStyle} ${isActive ? activeStyle : ''}`}
        >
            {children}
        </NavLink>
    );
};

// --- ✨ NUEVO: Componente de Menú Desplegable ---
// Reutilizable para el Menú de Usuario y el Menú de Gestión
const DropdownMenu = ({ button, children }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [dropdownRef]);

    return (
        <div className="relative" ref={dropdownRef}>
            {/* El botón que activa el dropdown */}
            {React.cloneElement(button, {
                onClick: () => setIsOpen(!isOpen),
                'aria-haspopup': true,
                'aria-expanded': isOpen
            })}
            
            {/* Contenido del Dropdown */}
            {isOpen && (
                <div
                    className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg border border-slate-200 py-1 z-20"
                    role="menu"
                    aria-orientation="vertical"
                >
                    {/* Hacemos 'children' clickeables para que cierren el menú */}
                    {React.Children.map(children, child => 
                        React.isValidElement(child) 
                        ? React.cloneElement(child, {
                            onClick: (e) => {
                                // Ejecuta la función onClick original del hijo (si existe)
                                child.props.onClick?.(e);
                                // Cierra el menú
                                setIsOpen(false);
                            }
                        })
                        : child
                    )}
                </div>
            )}
        </div>
    );
};

// --- Componente de Fila del Menú ---
const DropdownItem = ({ to, icon, children, ...props }) => {
    const Icon = icon;
    const content = (
        <span 
            className="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 transition"
            role="menuitem"
        >
            <Icon size={16} className="text-slate-500" />
            <span>{children}</span>
        </span>
    );
    
    // Si es un enlace, envuélvelo en Link
    if (to) {
        return <Link to={to} {...props}>{content}</Link>;
    }
    // Si es un botón (ej. Logout), envuélvelo en button
    return <button className="w-full text-left" {...props}>{content}</button>;
};

const DropdownItemDanger = (props) => (
    <DropdownItem 
        {...props} 
        className="block w-full text-left [&>span]:text-red-600 [&>span]:hover:bg-red-50 [&>span>svg]:text-red-600" 
    />
);

const DropdownHeader = ({ text }) => (
    <div className="px-4 py-2">
        <span className="block text-xs text-slate-400 uppercase tracking-wider">Bienvenido</span>
        <span className="block text-sm font-medium text-slate-700 truncate">{text}</span>
    </div>
);

const DropdownDivider = () => <div className="h-px bg-slate-200 my-1" />;


// --- Componente Principal Navbar ---
export default function Navbar() {
    const { itemCount } = useCart();
    const { user, isAuthenticated, logout } = useAuth();
    const navigate = useNavigate();
    const userRole = user?.rol;

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <header className="bg-white/95 backdrop-blur-sm shadow-sm sticky top-0 z-50 border-b border-slate-200">
            <div className="container mx-auto flex justify-between items-center px-4 h-16 max-w-7xl">

                {/* --- Logo y Navegación Principal --- */}
                <div className="flex items-center space-x-8">
                    <Link
                        to={isAuthenticated ? "/catalogo" : "/"}
                        className="text-xl font-bold text-slate-800 hover:text-indigo-600 transition-colors"
                    >
                        SmartSales<span className="text-indigo-600">365</span>
                    </Link>

                    {/* ✨ MEJORA: Navegación principal limpia (solo enlaces públicos/cliente) */}
                    <nav className="hidden md:flex items-center space-x-6 h-16">
                        {isAuthenticated && (
                            <>
                                <NavItem to="/catalogo">Catálogo</NavItem>
                                <NavItem to="/consultar-garantia">Garantía</NavItem>
                                
                                {userRole === 'CLI' && (
                                  <>
                                    <NavItem to="/mis-compras">Mis Compras</NavItem>
                                    <NavItem to="/favoritos">Favoritos</NavItem>
                                    </>
                                )}
                            </>
                        )}
                    </nav>
                </div>

                {/* --- Acciones del Usuario --- */}
                <div className="flex items-center space-x-2 sm:space-x-4">
                    
                    {isAuthenticated ? (
                        <>
                            {/* --- ✨ NUEVO: Menú "Gestión" (Solo Admin/Vendedor) --- */}
                            {(userRole === 'ADM' || userRole === 'VEN') && (
                                <DropdownMenu 
                                    button={
                                        <button className="hidden md:flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">
                                            <Settings size={16} />
                                            Gestión
                                            <ChevronDown size={14} />
                                        </button>
                                    }
                                >
                                    <DropdownItem to="/dashboard" icon={LayoutDashboard}>Dashboard</DropdownItem>
                                    <DropdownItem to="/pedidos" icon={Truck}>Gestión de Pedidos</DropdownItem>
                                    <DropdownItem to="/historial-ventas" icon={History}>Historial de Ventas</DropdownItem>
                                    <DropdownDivider />
                                    <DropdownItem to="/productos" icon={Package}>Productos</DropdownItem>
                                    <DropdownItem to="/categorias" icon={Bookmark}>Categorías</DropdownItem>
                                    <DropdownItem to="/admin/promociones" icon={TicketPercent}>Promociones</DropdownItem>
                                    <DropdownDivider />
                                    <DropdownItem to="/clientes" icon={Users}>Clientes</DropdownItem>
                                    <DropdownItem to="/admin/resenas" icon={MessageSquare}>Reseñas</DropdownItem>
                                    <DropdownItem to="/reportes" icon={BarChart3}>Reportes</DropdownItem>
                                    {userRole === 'ADM' && (
                                        <>
                                            <DropdownDivider />
                                            <DropdownItem to="/admin/usuarios" icon={Users}>Usuarios</DropdownItem>
                                        </>
                                    )}
                                </DropdownMenu>
                            )}

                            {/* --- Carrito de Compras --- */}
                            <Link
                                to="/carrito"
                                className="relative p-2 rounded-full text-slate-600 hover:bg-slate-100 hover:text-indigo-600 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                                aria-label={`Carrito de compras con ${itemCount} items`}
                            >
                                <ShoppingCart size={22} />
                                {itemCount > 0 && (
                                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center text-xs font-bold text-white bg-red-600 rounded-full">
                                        {itemCount}
                                    </span>
                                )}
                            </Link>

                            {/* --- ✨ MEJORA: Menú de Perfil (con Dropdown reutilizado) --- */}
                            <DropdownMenu
                                button={
                                    <button
                                        className="group rounded-full p-0.5 hover:ring-2 hover:ring-indigo-500 hover:ring-offset-2 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                                    >
                                        <span className="sr-only">Abrir menú de usuario</span>
                                        <User size={28} className="text-slate-500 group-hover:text-indigo-600 transition-colors" />
                                    </button>
                                }
                            >
                                <DropdownHeader text={user?.email} />
                                <DropdownDivider />
                                <DropdownItem to="/profile" icon={User}>Mi Perfil</DropdownItem>
                                {userRole === 'CLI' && (
                                    <DropdownItem to="/mis-compras" icon={ShoppingBag} className="md:hidden">Mis Compras</DropdownItem>
                                )}
                                <DropdownItem to="/consultar-garantia" icon={ShieldCheck} className="md:hidden">Garantía</DropdownItem>
                                <DropdownDivider />
                                <DropdownItemDanger onClick={handleLogout} icon={LogOut}>
                                    Cerrar Sesión
                                </DropdownItemDanger>
                            </DropdownMenu>
                        </>
                    ) : (
                        // --- Botones para visitante ---
                        <div className="flex items-center space-x-2">
                            <Link
                                to="/login"
                                className="px-4 py-2 text-sm text-slate-600 font-semibold hover:text-indigo-600 transition-colors rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                            >
                                Login
                            </Link>
                            <Link
                                to="/register"
                                className="px-4 py-2 text-sm bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                            >
                                Registrarse
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}