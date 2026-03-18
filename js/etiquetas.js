// js/etiquetas.js

function imprimirEtiqueta(producto, lote, cantidad){
    const win = window.open("", "", "width=500,height=800");

    win.document.write(`
        <html>
        <head>
            <style>
                body{
                    width:5cm;
                    height:8cm;
                    font-family:Arial;
                    text-align:center;
                }
                h2{ margin:5px 0; }
            </style>
        </head>
        <body>
            <h2>LAS PICONAS</h2>
            <p><strong>${producto}</strong></p>
            <p>Lote: ${lote}</p>
            <p>Cantidad: ${cantidad}</p>
            <p>Fecha: ${new Date().toLocaleDateString()}</p>
        </body>
        </html>
    `);

    win.document.close();
    win.print();
}