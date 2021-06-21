# (C) 2020 lifegpc
# This file is part of biliwebext.
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU Affero General Public License as published
# by the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU Affero General Public License for more details.
#
# You should have received a copy of the GNU Affero General Public License
# along with this program.  If not, see <http://www.gnu.org/licenses/>.
from getopt import getopt
import sys
from typing import List
from os.path import exists
from os import listdir, remove, system, mkdir
from platform import system as systemname
from re import search


def ph():
    print("prepare.py [-c] [-j <java location>] [-d] [file list]")

def gopt(args: List[str]):
    re = getopt(args, 'h?cj:d', ['help'])
    rr = re[0]
    r = {}
    h = False
    for i in rr:
        if i[0] == '-h' or i[0] == '-?' or i[0] == '--help':
            h = True
        if i[0] == '-c':
            r['c'] = True
        if i[0] == '-j' and not 'j' in r:
            r['j'] = i[1]
        if i[0] == '-d' and not 'd' in r:
            r['d'] = True
    if h:
        ph()
        exit()
    return r, re[1]


class main:
    _onlyc: bool = False
    _java: str = "java"
    _debug: bool = False

    def __init__(self, ip: dict, fl: List[str]):
        if 'c' in ip:
            self._onlyc = True
        if 'j' in ip:
            self._java = ip['j']
        if 'd' in ip:
            self._debug = ip['d']
        if not exists('js(origin)/'):
            raise FileNotFoundError('js(origin)/')
        if len(fl) == 0:
            fl = ['index.js']
        if not self._check_java():
            raise FileNotFoundError('Can not find java.')
        if not exists('compiler.jar'):
            raise FileNotFoundError('compiler.jar')
        for fn in fl:
            fn2 = f'js(origin)/{fn}'
            if not exists(fn2):
                raise FileNotFoundError(fn2)
        self._com_javascript(fl)

    def _check_java(self) -> bool:
        sn = systemname()
        s = " 2>&0 1>&0"
        if sn == "Linux":
            s = " > /dev/null 2>&1"
        if system(f"{self._java} -h{s}") == 0:
            return True
        return False

    def _com_javascript(self, fl: List[str]):
        print(f'INFO: compiler')
        jsf = ''
        for fn in fl:
            jsf += f' --js "js(origin)/{fn}"'
        dcm = f' --create_source_map "js/{fn}.map"' if self._debug else ""
        if system(f'{self._java} -jar compiler.jar{jsf} --compilation_level ADVANCED_OPTIMIZATIONS --language_in ECMASCRIPT_2019 --language_out ECMASCRIPT_2019 --js_output_file "js/{fn}"{dcm}') != 0:
            raise Exception('Error in compiler.')


if __name__ == "__main__":
    if len(sys.argv) == 1:
        main({}, [])
    else:
        ip, fl = gopt(sys.argv[1:])
        main(ip, fl)
