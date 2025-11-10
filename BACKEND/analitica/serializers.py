# analitica/serializers.py
from rest_framework import serializers

class ProductoBajaRotacionSerializer(serializers.Serializer):
    """
    Serializer (solo lectura) para mostrar productos con su total vendido.
    El campo 'total_vendido' es añadido por la vista usando .annotate()
    """
    id = serializers.IntegerField()
    nombre = serializers.CharField()
    marca = serializers.CharField()
    stock = serializers.IntegerField()
    imagen_url = serializers.URLField()
    # Este campo 'total_vendido' debe coincidir con el alias de la anotación en la vista
    total_vendido = serializers.IntegerField() 

    class Meta:
        fields = ['id', 'nombre', 'marca', 'stock', 'imagen_url', 'total_vendido']