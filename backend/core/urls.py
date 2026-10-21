from django.urls import path, include
from django.conf import settings
from rest_framework.routers import DefaultRouter
from .health import health
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
    LoginView,
    RefreshView,
)

router = DefaultRouter()
router.register(r'espacos-pessoais', EspacoPessoalViewSet, basename='espaco-pessoal')
router.register(r'itens-pessoais', ItemPessoalViewSet, basename='item-pessoal')
if settings.ENABLE_LEGACY_API:
    router.register(r'usuarios', UserViewSet)
    router.register(r'workspaces', WorkspaceViewSet)
    router.register(r'projetos', ProjetoViewSet)
    router.register(r'tarefas', TarefaViewSet)
    router.register(r'comentarios', ComentarioViewSet)
    router.register(r'notas', NotaViewSet, basename='nota')

urlpatterns = [
    path('api/health/', health, name='health'),
    path('api/registro/', RegistroUsuarioView.as_view(), name='registro_usuario'),
    path('api/token/', LoginView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', RefreshView.as_view(), name='token_refresh'),
    path('api/', include(router.urls)),
]
