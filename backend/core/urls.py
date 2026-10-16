from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import (
    ComentarioViewSet,
    ItemPessoalViewSet,
    EspacoPessoalViewSet,
    NotaViewSet,
    ProjetoViewSet,
    RegistroUsuarioView,
    TarefaViewSet,
    UserViewSet,
    WorkspaceViewSet,
)

router = DefaultRouter()
router.register(r'espacos-pessoais', EspacoPessoalViewSet, basename='espaco-pessoal')
router.register(r'itens-pessoais', ItemPessoalViewSet, basename='item-pessoal')
router.register(r'usuarios', UserViewSet)
router.register(r'workspaces', WorkspaceViewSet)
router.register(r'projetos', ProjetoViewSet)
router.register(r'tarefas', TarefaViewSet)
router.register(r'comentarios', ComentarioViewSet)
router.register(r'notas', NotaViewSet, basename='nota')

urlpatterns = [
    path('api/registro/', RegistroUsuarioView.as_view(), name='registro_usuario'),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/', include(router.urls)),
]
