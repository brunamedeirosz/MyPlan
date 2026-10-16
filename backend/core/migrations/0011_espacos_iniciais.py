from django.conf import settings
from django.db import migrations


def seed_spaces(apps, schema_editor):
    user_app, user_model = settings.AUTH_USER_MODEL.split('.')
    User = apps.get_model(user_app, user_model)
    Espaco = apps.get_model('core', 'EspacoPessoal')
    Item = apps.get_model('core', 'ItemPessoal')
    alias = schema_editor.connection.alias
    for user in User.objects.using(alias).iterator():
        personal = None
        for name in ['Pessoal', 'Trabalho', 'Estudos']:
            space, _ = Espaco.objects.using(alias).get_or_create(usuario_id=user.pk, nome=name)
            if name == 'Pessoal':
                personal = space
        Item.objects.using(alias).filter(usuario_id=user.pk, espaco__isnull=True).update(espaco_id=personal.pk)


class Migration(migrations.Migration):
    dependencies = [('core', '0010_espacopessoal_itempessoal_espaco_and_more')]
    operations = [migrations.RunPython(seed_spaces, migrations.RunPython.noop)]
