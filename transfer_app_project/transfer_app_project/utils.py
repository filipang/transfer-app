import os
import yaml


def load_env_variables():
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    print('caca')
    print(BASE_DIR)
    yaml_document = open(BASE_DIR + '/credentials.yaml')
    env_vars = yaml.load(yaml_document, Loader=yaml.Loader)
    env_vars = env_vars.get('env_variables')
    yaml_document.close()

    # add the key/value pairs from the yaml file to os.environ
    for key, value in env_vars.items():
        os.environ[key] = value
