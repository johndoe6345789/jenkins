"""Adapter registry. Adapters are Python modules in this package that expose
two callables:

    rotate(params: dict, new_password: str) -> None
    status(params: dict) -> dict     # read-only metadata, no secrets

Add a new backend by dropping a module here and referencing its name in
manifest.json's adapter field.
"""
from __future__ import annotations

import importlib
from types import ModuleType
from typing import Callable

_cache: dict[str, ModuleType] = {}


def load(name: str) -> ModuleType:
    if name not in _cache:
        _cache[name] = importlib.import_module(f'.{name}', package=__name__)
    return _cache[name]


def rotate(name: str) -> Callable[[dict, str], None]:
    return load(name).rotate


def status(name: str) -> Callable[[dict], dict]:
    return load(name).status
