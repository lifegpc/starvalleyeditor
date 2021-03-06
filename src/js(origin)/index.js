window["eventMap"] = {}
window["tempEventMap"] = {}
var require = window.hasOwnProperty("require") ? window['require'] : null;

window.addEventListener('load', () => {
    /**@type {HTMLInputElement}*/
    var inpute = document.getElementById('input');
    var sty = document.createElement('style');
    document.head.append(sty);
    /**
     * 改变内容样式
     * @param {boolean} display 是否显示
     */
    function changeContentStyle(display) {
        sty.innerText = display ? '' : '.content {display: none}';
    }
    changeContentStyle(false);
    var nw = window.hasOwnProperty("nw") ? window['nw'] : null;
    /**@type {Object<string,string>} */
    var env = nw ? nw['process']['env'] : null;
    var os = env && env.hasOwnProperty("OS") ? env['OS'] : null;
    var appdata = env && env.hasOwnProperty("APPDATA") ? env['APPDATA'] : null;
    if (os != null && appdata != null & os.startsWith('Windows')) {
        inpute.setAttribute('nwworkingdir', appdata + '\\StardewValley\\Saves');
    }
    /**@type {HTMLButtonElement}*/
    var opene = document.getElementById('open');
    opene.addEventListener('click', () => {
        if (!inpute.files.length) return;
        /**@type {Array<File>}*/
        var fns = [];
        for (var i = 0; i < inpute.files.length; i++) fns.push(inpute.files[i]);
        /**@type {File}*/
        var mainfile = undefined;
        fns.forEach((file) => {
            if (file.name.endsWith("_old")) return;
            if (file.name == "SaveGameInfo") return;
            if (mainfile == undefined || file.size > mainfile.size) mainfile = file;
        });
        try {
            mainfile.text().then((str) => {
                var p = new DOMParser();
                var doc = p.parseFromString(str, "text/xml");
                var backdoc = p.parseFromString(str, "text/xml");
                window["doc"] = doc;
                window["backdoc"] = backdoc;
                if (!dealXML()) {
                    alert("Open file failed: invaild file. (Maybe BUG in editor.)");
                } else {
                    changeContentStyle(true);
                }
            })
        } catch (e) {
            console.warn(e);
        }
    })
    /**@type {HTMLInputElement}*/
    var savee = document.getElementById('save');
    function saveFile() {
        if (!savee.files.length) {
            alert("No file selected. Please choose a file name in left button.")
            return;
        }
        if (null == require) {
            alert('Can not use node.js');
            return;
        }
        try {
            var fs = require('fs');
            /**@type {Document?}*/
            var doc = window.hasOwnProperty("doc") ? window["doc"] : null;
            if (doc == null) {
                alert("No file opened.");
                return;
            }
            var x = new XMLSerializer();
            var s = x.serializeToString(doc.getRootNode());
            /**@type {string}*/
            var fn = savee.files[0]["path"];
            if (fs["existsSync"](fn)) {
                fs["rmSync"](fn);
                if (fs["existsSync"](fn)) {
                    alert("Can not remove existed file")
                    return;
                }
            }
            fs["writeFile"](fn, s, (err) => {
                if (err) {
                    console.warn(err);
                    alert('Save failed.');
                    return;
                }
                alert('Save complete.');
                if (nw != null) {
                    var shell = nw["Shell"];
                    if (shell.hasOwnProperty("showItemInFolder")) {
                        shell["showItemInFolder"](fn);
                    }
                }
            })
        }
        catch (e) {
            alert('Can not import fs moudle.')
            return;
        }
    }
    savee.addEventListener('input', saveFile);
    document.getElementById('saveb').addEventListener('click', saveFile);
})

/**
 * 获取子元素（一层）中的内容
 * @param {HTMLElement} node
 * @param {string} tag
 * @returns {Array<Element>}
 */
function getElementsByTagInFirst(node, tag) {
    var l = node.getElementsByTagName(tag);
    var re = [];
    for (var i = 0; i < l.length; i++) {
        if (l[i].parentElement == node) {
            re.push(l[i]);
        }
    }
    return re;
}

var eventID = 0;
var globalEvent = true;
var tempEventID = 0;

function clearTempEvent() {
    tempEventID = 0;
    window["tempEventMap"] = {};
}

/**
 * 为Event增加map
 * @param {HTMLElement} element 元素
 * @param {keyof HTMLElementEventMap} key 网页事件名称
 * @param {(this: HTMLElement, ev: HTMLElementEventMap[key]) => any} ev 事件
 */
function handleEvent(element, key, ev) {
    var hasEv = element.hasAttribute("ev");
    var hasTev = element.hasAttribute("tev");
    if (!hasEv && !hasTev) {
        if (globalEvent && !hasEv) element.setAttribute("ev", eventID++);
        if (!globalEvent && !hasTev) element.setAttribute("tev", tempEventID++);
    }
    var isGlobal = element.hasAttribute("ev") ? true : element.hasAttribute("tev") ? false : null;
    if (isGlobal === null) {
        element.addEventListener(key, ev);
        return;
    }
    var id = isGlobal ? element.getAttribute("ev") : element.getAttribute("tev");
    id += "," + key;
    /**@type {Object.<string, EventListenerObject} */
    var eventMap = isGlobal ? window["eventMap"] : window["tempEventMap"];
    if (eventMap.hasOwnProperty(id)) {
        element.removeEventListener("input", eventMap[id]);
        delete eventMap[id];
    }
    element.addEventListener(key, ev);
    eventMap[id] = ev;
}

/**
 * 为普通的输入框处理更改事件
 * @param {HTMLInputElement} element 元素
 * @param {(e: HTMLInputElement) => boolean} changefun 改变Obj内值的fun
 * @param {(e: HTMLInputElement) => boolean} checkfun 检查更改值是否合法
 */
function handleNormalInput(element, changefun = undefined, checkfun = undefined) {
    handleEvent(element, "input", () => {
        if (element.validationMessage !== "") return;
        if (checkfun != undefined && !checkfun(element)) return;
        if (changefun != undefined && !changefun(element)) return;
    });
}

/**
 * 使用常规方式处理输入框更改
 * @param {HTMLInputElement|Element} element 元素
 * @param {Element} target XML元素
 * @param {boolean} allowEmpty 是否允许写入空值
 * @param {(e: HTMLInputElement) => boolean} checkfun 检查更改值是否合法
 */
function handleNormalInputInNormalChangeFun(element, target, allowEmpty = false, checkfun = undefined) {
    handleNormalInput(element, (e) => {
        try {
            if (!allowEmpty && !e.value.length) return false;
            target.innerHTML = e.value;
            return true;
        } catch (e) {
            console.warn(e);
            return false;
        }
    }, checkfun);
}

/**
 * 处理当前值/最大值类型
 * @param {HTMLInputElement|Element} ele1 当前值元素
 * @param {HTMLInputElement|Element} ele2 最大值元素
 * @param {Element} tar1 当前值XML元素
 * @param {Element} tar2 最大值XML元素
 */
function handleNowMax(ele1, ele2, tar1, tar2) {
    handleEvent(ele1, "input", () => {
        if (ele1.validationMessage !== "") return;
        if (ele2.validationMessage !== "") {
            ele2.value = ele1.value;
            tar2.innerHTML = ele2.value;
        }
        else if (ele1.valueAsNumber > ele2.valueAsNumber) ele1.value = ele2.value;
        tar1.innerHTML = ele1.value;
    });
    handleEvent(ele2, "input", () => {
        if (ele2.validationMessage !== "") return;
        if (ele1.validationMessage !== "") {
            ele1.value = ele2.value;
            tar1.innerHTML = ele1.value;
        }
        else if (ele1.valueAsNumber > ele2.valueAsNumber) ele2.value = ele1.value;
        tar2.innerHTML = ele2.value;
    })
}

/**
 * 为普通的选择框处理更改事件
 * @param {HTMLSelectElement} element 元素
 * @param {Element} target XML元素
 */
function handleNormalSelBox(element, target) {
    handleEvent(element, "input", () => {
        if (element.selectedIndex > -1) {
            try {
                if (element.value.length) {
                    target.innerHTML = element.value;
                }
            } catch (e) {
                console.warn(e);
            }
        }
    })
}

/**
 * 为普通的checkbox处理更改事件
 * @param {HTMLInputElement|HTMLDivElement} element createCheckElement 方法返回的元素
 * @param {Element} target XML元素
 * @param {boolean} reverse 是否反向输入
 */
function handleNormalCheckBox(element, target, reverse = false) {
    /**@type {HTMLInputElement}*/
    var inp = element.constructor.name == "HTMLInputElement" ? element : element.children[0];
    handleEvent(inp, "input", () => {
        try {
            target.innerHTML = reverse ? !inp.checked : inp.checked;
        } catch (e) {
            console.warn(e);
        }
    })
}

/**
 * 根据输入新建select元素
 * @param {Object.<string, string|number>} map 输入 key为显示内容 value为实际内容
 * @returns {HTMLSelectElement}
 */
function createSelElement(map) {
    var sel = document.createElement('select');
    Object.getOwnPropertyNames(map).forEach((key) => {
        var op = document.createElement('option');
        op.innerText = key;
        op.value = map[key];
        sel.append(op);
    })
    return sel;
}

var checkBoxId = 0;

/**
 * 创建CheckBox
 * @param {boolean|string} value 初始值
 * @param {string|undefined} str 标签内容
 * @returns {HTMLDivElement|HTMLInputElement} 如果有标签，为div，否则为input
 */
function createCheckElement(value = false, str = undefined) {
    var inp = document.createElement('input');
    inp.type = "checkbox";
    inp.checked = value.constructor.name == "Boolean" ? value : value.toLowerCase() == "true" ? true : false;
    if (str != undefined && !str.length) {
        var label = document.createElement('label');
        label.innerText = str;
        inp.id = "checkbox" + checkBoxId++;
        label.htmlFor = inp.id;
        var div = document.createElement('div');
        div.append(inp);
        div.append(label);
        return div;
    }
    return inp;
}

/**
 * 加换行
 * @param {HTMLElement|Element} ele 要加换行的元素
 */
function addBrToElement(ele) {
    ele.append(document.createElement('br'));
}

/**
 * XML DOM转JSON
 * @param {Element} node XML元素
 * @returns {Object<string, {"target": Element, "content": Object}>} 可能套壳
 */
function getObj(node) {
    var o = {};
    var l = node.children;
    for (var i = 0; i < l.length; i++) {
        var key = l[i].localName;
        if (l[i].childElementCount) o[key] = { "target": l[i], "content": getObj(l[i]) };
        else o[key] = { "target": l[i], "content": l[i].innerHTML };
    }
    return o;
}

/**
 * 处理友情数据
 * @param {Element} node friendshipData节点
 * @returns {Object.<string, {"target": Element, "content": Object}>} 返回的obj
 */
function dealFriendshipData(node) {
    var l = node.children;
    /**@type {Array<Element>} */
    var li = [];
    for (var i = 0; i < l.length; i++) {
        if (l[i].localName == "item") li.push(l[i]);
    }
    var obj = {};
    li.forEach((v) => {
        var l = getElementsByTagInFirst(v, "key");
        if (!l.length) return;
        if (!l[0].childElementCount) return;
        var key = l[0].children[0].innerHTML;
        l = getElementsByTagInFirst(v, "value");
        if (!l.length) return;
        if (!l[0].childElementCount) return;
        var i = l[0].children[0];
        obj[key] = getObj(i);
    })
    return obj;
}

/**
 * 处理送礼物个数
 * @param {HTMLInputElement} ele1 每日送礼数元素
 * @param {HTMLInputElement} ele2 每周送礼数元素
 * @param {Element} tar1 每日XML元素
 * @param {Element} tar2 每周XML元素
 */
function handleGift(ele1, ele2, tar1, tar2) {
    handleEvent(ele1, "input", () => {
        if (ele1.validationMessage !== "") return;
        if (ele2.validationMessage !== "") {
            ele2.value = ele1.value;
            tar2.innerHTML = ele2.value;
        }
        else if (ele1.valueAsNumber && !ele2.valueAsNumber) {
            ele2.value = ele1.value;
            tar2.innerHTML = ele2.value;
        }
        tar1.innerHTML = ele1.value;
    });
    handleEvent(ele2, "input", () => {
        if (ele2.validationMessage !== "") return;
        if (ele1.validationMessage !== "") {
            ele1.value = ele2.valueAsNumber > 0 ? 1 : 0;
            tar1.innerHTML = ele1.value;
        }
        else if (!ele2.valueAsNumber && ele1.valueAsNumber) {
            ele1.value = 0;
            tar1.innerHTML = ele1.value;
        }
        tar2.innerHTML = ele2.value;
    })
}

/**
 * 根据内容创建表格
 * @param {Object.<string, {"target": Element, "content": Object}>} data 内容
 * @returns {HTMLTableElement}
 */
function createFriendShipTable(data) {
    /**@type {Array<Object.<string, string|{"target": Element, "content": Object}>}*/
    var list = [];
    Object.getOwnPropertyNames(data).forEach((key) => {
        var o = data[key];
        o["name"] = key;
        list.push(o);
    })
    var table = document.createElement('table');
    var thead = document.createElement('thead');
    var theadr = document.createElement('tr');
    var td = document.createElement('td');
    theadr.classList.add("first");
    td.classList.add("first");
    td.innerText = 'Name';
    thead.append(theadr);
    theadr.append(td);
    td = document.createElement('td');
    td.innerText = 'Points';
    theadr.append(td);
    td = document.createElement('td');
    td.innerText = 'Status';
    theadr.append(td);
    td = document.createElement('td');
    td.innerText = 'Roommate Marriage';
    theadr.append(td);
    td = document.createElement('td');
    td.innerText = 'Talked Today';
    theadr.append(td);
    td = document.createElement('td');
    td.innerText = 'Gifts Today';
    theadr.append(td);
    td = document.createElement('td');
    td.innerText = 'Gifts This Week';
    theadr.append(td);
    table.append(thead);
    var tbody = document.createElement('tbody');
    table.append(tbody);
    /**@type {Object.<string, HTMLTableRowElement>}*/
    var objmap = {};
    list.forEach((d) => {
        var row = document.createElement('tr');
        var td = document.createElement('td');
        td.classList.add("first");
        td.innerText = d["name"];
        row.append(td);
        td = document.createElement('td');
        var inp = document.createElement('input');
        inp.min = 0;
        inp.max = 14 * 250;
        inp.type = "number";
        inp.style.width = "100px";
        inp.value = d["Points"]["content"];
        handleNormalInputInNormalChangeFun(inp, d["Points"]["target"]);
        td.append(inp);
        row.append(td);
        td = document.createElement('td');
        var sel = createSelElement({ "Friendly": "Friendly", "Dating": "Dating", "Engaged": "Engaged", "Married": "Married" });
        sel.value = d["Status"]["content"];
        handleNormalSelBox(sel, d["Status"]["target"]);
        td.append(sel);
        row.append(td);
        td = document.createElement('td');
        var check = createCheckElement(d["RoommateMarriage"]["content"]);
        handleNormalCheckBox(check, d["RoommateMarriage"]["target"]);
        td.append(check);
        row.append(td);
        td = document.createElement('td');
        check = createCheckElement(d["TalkedToToday"]["content"]);
        handleNormalCheckBox(check, d["TalkedToToday"]["target"]);
        td.append(check);
        row.append(td);
        td = document.createElement('td');
        inp = document.createElement('input');
        inp.min = 0;
        inp.max = 1;
        inp.type = "number";
        inp.style.width = "25px";
        inp.value = d["GiftsToday"]["content"];
        td.append(inp);
        row.append(td);
        td = document.createElement('td');
        var inp2 = document.createElement('input');
        inp2.min = 0;
        inp2.max = 2;
        inp2.type = "number";
        inp2.style.width = "25px";
        inp2.value = d["GiftsThisWeek"]["content"];
        handleGift(inp, inp2, d["GiftsToday"]["target"], d["GiftsThisWeek"]["target"]);
        td.append(inp2);
        row.append(td);
        objmap[d["name"]] = row;
        tbody.append(row);
    })
    return table;
}

/**
 * 创建可折叠内容
 * @param {HTMLElement} ele 元素
 * @param {string|HTMLElement} text 描述内容
 * @returns {HTMLDivElement}
 */
function createFoldDiv(ele, text) {
    var div = document.createElement('div');
    div.className = 'fold'
    var icon = document.createElement('div');
    icon.className = 'icon';
    var folddiv = document.createElement('div');
    folddiv.className = 'folddiv';
    handleEvent(icon, "mouseenter", () => {
        if (!icon.classList.contains("hover")) icon.classList.add("hover");
    })
    handleEvent(icon, "mouseleave", () => {
        if (icon.classList.contains("hover")) icon.classList.remove("hover");
    })
    handleEvent(icon, "click", () => {
        if (div.classList.contains("opened")) div.classList.remove("opened");
        else div.classList.add("opened");
    })
    div.append(icon);
    div.append(text);
    addBrToElement(div);
    folddiv.append(ele);
    div.append(folddiv);
    return div;
}

/**
 * 计算技能等级
 * @param {number|string} exp 
 */
function calLevel(exp) {
    var num = typeof exp == "string" ? parseInt(exp) : exp;
    if (num >= 15000) return 10;
    if (num >= 10000) return 9;
    if (num >= 6900) return 8;
    if (num >= 4800) return 7;
    if (num >= 3300) return 6;
    if (num >= 2150) return 5;
    if (num >= 1300) return 4;
    if (num >= 770) return 3;
    if (num >= 380) return 2;
    if (num >= 100) return 1;
    return 0;
}

/**
 * 根据ID获取职业名称
 * @param {number|string} id 职业ID
 */
function getProfessionName(id) {
    var num = typeof id == "string" ? parseInt(id) : id;
    if (num == 0) return "Rancher";
    if (num == 1) return "Tiller";
    if (num == 2) return "Coopmaster";
    if (num == 3) return "Shepherd";
    if (num == 4) return "Artisan";
    if (num == 5) return "Agriculturist";
    if (num == 6) return "Fisher";
    if (num == 7) return "Trapper";
    if (num == 8) return "Angler";
    if (num == 9) return "Pirate";
    if (num == 10) return "Mariner";
    if (num == 11) return "Luremaster";
    if (num == 12) return "Forester";
    if (num == 13) return "Gatherer";
    if (num == 14) return "Lumberjack";
    if (num == 15) return "Tapper";
    if (num == 16) return "Botanist";
    if (num == 17) return "Tracker";
    if (num == 18) return "Miner";
    if (num == 19) return "Geologist";
    if (num == 20) return "Blacksmith";
    if (num == 21) return "Prospector";
    if (num == 22) return "Excavator";
    if (num == 23) return "Gemologist";
    if (num == 24) return "Fighter";
    if (num == 25) return "Scout";
    if (num == 26) return "Brute";
    if (num == 27) return "Defender";
    if (num == 28) return "Acrobat";
    return "Desperado";
}

/**@type {Object.<number, Object.<number, Array<number>>>} 第一层，技能类别，第二层，5级时技能。*/
var professionsMap = {
    0: { 0: [2, 3], 1: [4, 5] },
    1: { 6: [8, 9], 7: [10, 11] },
    2: { 12: [14, 15], 13: [16, 17] },
    3: { 18: [20, 21], 19: [22, 23] },
    4: { 24: [26, 27], 25: [28, 29] }
}

/**@type {Object.<number, Array<number>>} 该技能所对应的类别和需要等级以及上一个技能ID*/
var skillMap = {};

Array.from(new Array(30).keys()).forEach((key) => {
    for (var i = 0; i < 5; i++) {
        var k = Object.getOwnPropertyNames(professionsMap[i]);
        if (k.includes(key.toString())) {
            skillMap[key] = [parseInt(i), 5, null];
            return;
        }
        var found = false;
        k.forEach((i2) => {
            if (professionsMap[i][i2].includes(key)) {
                skillMap[key] = [parseInt(i), 10, parseInt(i2)];
                found = true;
                return;
            }
        })
        if (found) return;
    }
})

/**
 * 在职业数组中寻找符合的职业，未找到返回-1
 * @param {Array<number>} proarr 职业数组
 * @param {number} skillType 技能类型
 * @param {number} skillLevel 技能等级
 */
function findProfessionIndex(proarr, skillType, skillLevel) {
    if (skillLevel > 5 && skillLevel < 10) skillLevel = 5;
    else if (skillLevel > 10) skillLevel = 10;
    for (var i = 0; i < proarr.length; i++) {
        var info = skillMap[proarr[i]];
        if (info[0] == skillType && info[1] == skillLevel) return i;
    }
    return -1;
}

/**
 * 返回适合的职业列表
 * @param {number} skillType 技能类型
 * @param {number} skillLevel 技能等级
 * @param {number|undefined} preProfession 前一个职业
 */
function getProfessionList(skillType, skillLevel, preProfession = undefined) {
    if (skillLevel > 5 && skillLevel < 10) skillLevel = 5;
    else if (skillLevel > 10) skillLevel = 10;
    /**@type {Array<number>}*/
    var li = [];
    if (skillLevel == 5) {
        Array.from(new Array(30).keys()).forEach((i) => {
            var info = skillMap[i];
            if (info[0] == skillType && info[1] == skillLevel) li.push(i);
        })
    } else if (skillLevel == 10) {
        if (preProfession == undefined) {
            var keys = Object.getOwnPropertyNames(professionsMap[skillType]);
            preProfession = parseInt(keys[0]);
        }
        Array.from(new Array(30).keys()).forEach((i) => {
            var info = skillMap[i];
            if (info[0] == skillType && info[1] == skillLevel && info[2] == preProfession) li.push(i);
        })
    }
    return li;
}

/**
 * 验证并纠正职业数组
 * @param {Array<Element>} levelArr 等级
 * @param {Array<number>} pro 职业
 */
function veifyProfessionsArr(levelArr, pro) {
    /**@type {Array<number>} 职业列表*/
    var li = [];
    pro.forEach((p) => {
        var info = skillMap[p];
        var level = parseInt(levelArr[info[0]].innerHTML);
        if (level < info[1]) return;
        if (info[2] !== null && !pro.includes(info[2])) return;
        for (var i = 0; i < li.length; i++) {
            var cinfo = skillMap[li[i]];
            if (info[0] == cinfo[0] && info[1] == cinfo[1]) return;
        }
        li.push(p);
    });
    /**查找某技能某等级的技能是否存在
     * @param {number} skillType 技能类型
     * @param {number} skillLevel 技能等级
     */
    function findExist(skillType, skillLevel) {
        return findProfessionIndex(li, skillType, skillLevel) > -1;
    }
    /**
     * 在列表中增加某等级的技能对应的职业
     * @param {number} skillType 技能类型
     * @param {number} skillLevel 技能等级
     * @param {number|undefined} preProfession 前一个技能等级
     */
    function addTo(skillType, skillLevel, preProfession) {
        if (skillLevel > 5 && skillLevel < 10) skillLevel = 5;
        else if (skillLevel > 10) skillLevel = 10;
        var keys = Object.getOwnPropertyNames(professionsMap[skillType]);
        var first = parseInt(keys[0]);
        if (skillLevel == 5) {
            li.push(first);
        } else if (skillLevel == 10) {
            if (preProfession == undefined) preProfession = first;
            li.push(professionsMap[skillType][preProfession][0]);
        }
    }
    levelArr.forEach((v, i) => {
        if (i >= 5) return;
        var level = parseInt(v.innerHTML);
        if (level >= 5) {
            if (!findExist(i, 5)) addTo(i, 5);
            if (level >= 10) {
                var ind = findProfessionIndex(li, i, 5);
                if (ind > -1) addTo(i, 10, li[ind]);
            }
        }
    })
    return li;
}

/**
 * 数组转number[]
 * @param {Element} ele XML元素
 */
function IntArrElementToArr(ele) {
    /**@type {Array<number>}*/
    var li = [];
    for (var i = 0; i < ele.childElementCount; i++) {
        var e = ele.children[i];
        if (e.localName == "int") {
            li.push(parseInt(e.innerHTML));
        } else {
            console.warn('This XML Element has not int element: ', ele, e);
        }
    }
    return li;
}

/**
 * number[]转元素
 * @param {Array<number>} arr 数组
 * @param {Element} ele 元素
 */
function IntArrToElement(arr, ele) {
    ele.innerHTML = '';
    arr.forEach((v) => {
        /**@type {Document}*/
        var doc = window['doc'];
        var e = doc.createElement('int');
        e.innerHTML = v;
        ele.append(e);
    })
}

/**
 * 创建经验Div
 * @param {Element} node 经验点数
 * @param {Array<Element>} levelArr 对应的等级元素
 * @param {Element} professions 职业
 */
function createExpDiv(node, levelArr, professions) {
    var div = document.createElement('div');
    var arr = Array.from(new Array(node.childElementCount).keys());
    /**@type {Array<Array<HTMLSelectElement>>} */
    var seld = [];
    /**
     * 更新选项框
     * @param {HTMLSelectElement} sel 5级选择框
     * @param {HTMLSelectElement} sel2 10级选择框
     * @param {number} skillType 职业类型
     * @param {Array<number>} proarr 职业数组
     */
    function updateSel(sel, sel2, skillType, proarr) {
        /**
         * 更新select元素
         * @param {HTMLSelectElement} sel 元素
         * @param {number} value 职业，-1表示无
         * @param {Array<number>} pros 可选职业
         */
        function updateSelEle(sel, value, pros) {
            if (value == -1 || !pros.length) {
                sel.innerHTML = '';
                var op = document.createElement('option');
                op.value = '-1';
                op.innerText = 'Unavailable';
                sel.append(op);
                sel.value = '-1';
            } else {
                sel.innerHTML = '';
                pros.forEach((i) => {
                    var op = document.createElement('option');
                    op.value = i;
                    op.innerText = getProfessionName(i);
                    sel.append(op);
                });
                sel.value = value;
            }
        }
        var level = parseInt(levelArr[skillType].innerHTML);
        var ind = level < 5 ? -1 : findProfessionIndex(proarr, skillType, 5);
        if (ind == -1) updateSelEle(sel, -1, []);
        else updateSelEle(sel, proarr[ind], getProfessionList(skillType, 5));
        var ind2 = ind == -1 || level < 10 ? -1 : findProfessionIndex(proarr, skillType, 10);
        if (ind2 == -1) updateSelEle(sel2, -1, []);
        else updateSelEle(sel2, proarr[ind2], getProfessionList(skillType, 10, proarr[ind]));
    }
    /**
     * 更新所有选择框
     * @param {Array<number>|undefined} prof 职业列表（无需进行验证）
     */
    function updateAllSel(prof = undefined) {
        if (prof == undefined) prof = IntArrElementToArr(professions);
        var vepro = veifyProfessionsArr(levelArr, prof);
        seld.forEach((l, i) => {
            updateSel(l[0], l[1], i, vepro);
        })
        IntArrToElement(vepro, professions);
    }
    arr.forEach((i) => {
        if (i != 0) addBrToElement(div);
        var inp = document.createElement('input');
        inp.type = "number";
        inp.min = 0;
        switch (i) {
            case 0:
                div.append("Farming points: ")
                break;
            case 1:
                div.append("Fishing points: ")
                break;
            case 2:
                div.append("Foraging points: ")
                break;
            case 3:
                div.append("Mining points: ")
                break;
            case 4:
                div.append("Combot points: ")
                break;
            case 5:
                div.append("Luck points: ")
                break;
        }
        inp.value = node.children[i].innerHTML;
        div.append(inp);
        div.append('(Level: ')
        var level = document.createElement('label');
        level.innerText = calLevel(node.children[i].innerHTML);
        div.append(level);
        div.append(')');
        handleEvent(inp, "input", () => {
            if (inp.value.length) {
                node.children[i].innerHTML = inp.value;
                var lev = calLevel(inp.value);
                level.innerText = lev;
                levelArr[i].innerHTML = lev;
                updateAllSel();
            }
        })
    })
    var vepro = veifyProfessionsArr(levelArr, IntArrElementToArr(professions));
    IntArrToElement(vepro, professions);
    arr.forEach((i) => {
        if (i >= 5) return;
        addBrToElement(div);
        switch (i) {
            case 0:
                div.append("Farming professions: ")
                break;
            case 1:
                div.append("Fishing professions: ")
                break;
            case 2:
                div.append("Foraging professions: ")
                break;
            case 3:
                div.append("Mining professions: ")
                break;
            case 4:
                div.append("Combot professions: ")
                break;
        }
        var sel = document.createElement('select');
        var sel2 = document.createElement('select');
        div.append(sel);
        div.append(' -> ');
        div.append(sel2);
        updateSel(sel, sel2, i, vepro);
        seld.push([sel, sel2]);
        /**
         * 处理input
         * @param {HTMLSelectElement} sel 元素
         * @param {number} skillLevel 技能等级
         */
        function update(sel, skillLevel) {
            var pros = IntArrElementToArr(professions);
            var ind = findProfessionIndex(pros, i, skillLevel);
            if (ind == -1) pros.push(parseInt(sel.value));
            else pros[ind] = parseInt(sel.value);
            updateAllSel(pros);
        }
        handleEvent(sel, "input", () => {
            update(sel, 5);
        })
        handleEvent(sel2, "input", () => {
            update(sel2, 10);
        })
    })
    return div;
}

function dealXML() {
    /**@type {Document}*/
    var doc = window['doc'];
    var doce = doc.documentElement;
    globalEvent = true;
    var l = getElementsByTagInFirst(doce, "gameVersion");
    if (!l.length) return false;
    document.getElementById('gamev').innerText = l[0].innerHTML;
    l = getElementsByTagInFirst(doce, "year");
    if (!l.length) return false;
    /**@type {HTMLInputElement}*/
    var year = document.getElementById('year');
    year.value = l[0].innerHTML;
    handleNormalInputInNormalChangeFun(year, l[0]);
    l = getElementsByTagInFirst(doce, "currentSeason");
    if (!l.length) return false;
    /**@type {HTMLSelectElement}*/
    var season = document.getElementById('season');
    season.value = l[0].innerHTML;
    handleNormalSelBox(season, l[0]);
    l = getElementsByTagInFirst(doce, "dayOfMonth");
    if (!l.length) return false;
    var day = document.getElementById('day');
    day.value = l[0].innerHTML;
    handleNormalInputInNormalChangeFun(day, l[0]);
    /**@type {HTMLUListElement}*/
    var playerTab = document.getElementById('playertab');
    /**@type {Array<HTMLElement>} */
    var playerList = [];
    var playerContentList = document.getElementById('playerContentList');
    playerTab.innerHTML = '';
    playerContentList.innerHTML = '';
    l = getElementsByTagInFirst(doce, "player");
    if (!l.length) return false;
    playerList.push(l[0]);
    l = doc.getElementsByTagName('farmhand');
    for (var i = 0; i < l.length; i++) playerList.push(l[i]);
    var firstTab = true;
    globalEvent = false;
    clearTempEvent();
    playerList.forEach((v) => {
        var tab = document.createElement("li");
        var page = document.createElement('div');
        var l = getElementsByTagInFirst(v, "name");
        if (!l.length) return;
        tab.innerText = l[0].innerHTML;
        page.innerText = "Name: " + l[0].innerHTML;
        l = getElementsByTagInFirst(v, "yearForSaveGame");
        if (!l.length) return;
        addBrToElement(page);
        page.append("Saved Time: Year ");
        var inp = document.createElement('input');
        inp.min = 1;
        inp.type = "number";
        inp.style.width = "40px";
        inp.value = l[0].innerHTML;
        handleNormalInputInNormalChangeFun(inp, l[0]);
        page.append(inp);
        page.append(" ");
        l = getElementsByTagInFirst(v, "seasonForSaveGame");
        var sel = createSelElement({ "Spring": 0, "Summer": 1, "Fall": 2, "Winter": 3 });
        sel.value = l[0].innerHTML;
        handleNormalSelBox(sel, l[0]);
        page.append(sel);
        page.append(' Day ');
        l = getElementsByTagInFirst(v, "dayOfMonthForSaveGame");
        if (!l.length) return;
        inp = document.createElement('input');
        inp.min = 1;
        inp.max = 29;
        inp.type = "number";
        inp.style.width = "35px";
        inp.value = l[0].innerHTML;
        handleNormalInputInNormalChangeFun(inp, l[0]);
        page.append(inp);
        addBrToElement(page);
        l = getElementsByTagInFirst(v, "UniqueMultiplayerID");
        if (!l.length) return;
        page.append("Unique Multiplayer ID: " + l[0].innerHTML);
        addBrToElement(page);
        page.append("Money: ");
        l = getElementsByTagInFirst(v, "money");
        if (!l.length) return;
        inp = document.createElement('input');
        inp.min = 0;
        inp.type = "number";
        inp.style.width = "100px";
        inp.value = l[0].innerHTML;
        handleNormalInputInNormalChangeFun(inp, l[0]);
        page.append(inp);
        addBrToElement(page);
        page.append("Total Money Earned: ");
        l = getElementsByTagInFirst(v, "totalMoneyEarned");
        if (!l.length) return;
        inp = document.createElement('input');
        inp.min = 0;
        inp.type = "number";
        inp.style.width = "100px";
        inp.value = l[0].innerHTML;
        handleNormalInputInNormalChangeFun(inp, l[0]);
        page.append(inp);
        addBrToElement(page);
        page.append('Gender: ');
        sel = createSelElement({ "Male": "true", "Female": "false" });
        l = getElementsByTagInFirst(v, "isMale");
        if (!l.length) return;
        sel.value = l[0].innerHTML;
        handleNormalSelBox(sel, l[0]);
        page.append(sel);
        addBrToElement(page);
        page.append('Health: ');
        l = getElementsByTagInFirst(v, "health");
        if (!l.length) return;
        var mip = document.createElement('input');
        mip.min = 1;
        mip.type = "number";
        mip.style.width = "40px";
        mip.value = l[0].innerHTML;
        var l2 = getElementsByTagInFirst(v, "maxHealth");
        if (!l2.length) return;
        var minp = document.createElement('input');
        minp.min = 1;
        minp.type = "number";
        minp.style.width = "40px";
        minp.value = l2[0].innerHTML;
        handleNowMax(mip, minp, l[0], l2[0]);
        page.append(mip);
        page.append('/');
        page.append(minp);
        addBrToElement(page);
        page.append("Stamina: ");
        l = getElementsByTagInFirst(v, "stamina");
        if (!l.length) return;
        var sta = document.createElement('input');
        sta.min = 1;
        sta.type = "number";
        sta.style.width = "40px";
        sta.value = l[0].innerHTML;
        l2 = getElementsByTagInFirst(v, "maxStamina");
        if (!l2.length) return;
        var msta = document.createElement('input');
        msta.min = 1;
        msta.type = "number";
        msta.style.width = "40px";
        msta.value = l2[0].innerHTML;
        handleNowMax(sta, msta, l[0], l2[0]);
        page.append(sta);
        page.append('/');
        page.append(msta);
        addBrToElement(page);
        page.append("Max Items: ");
        l = getElementsByTagInFirst(v, "maxItems");
        if (!l.length) return;
        sel = createSelElement({ 12: 12, 24: 24, 36: 36 });
        sel.value = l[0].innerHTML;
        handleNormalSelBox(sel, l[0]);
        page.append(sel);
        addBrToElement(page);
        page.append("Deepest Mine Level: ");
        l = getElementsByTagInFirst(v, "deepestMineLevel");
        if (!l.length) return;
        inp = document.createElement('input');
        inp.min = 1;
        inp.max = 120;
        inp.type = "number";
        inp.style.width = "40px";
        inp.value = l[0].innerHTML;
        page.append(inp);
        handleNormalInputInNormalChangeFun(inp, l[0]);
        addBrToElement(page);
        l = getElementsByTagInFirst(v, "friendshipData");
        if (!l.length) return;
        var frida = dealFriendshipData(l[0]);
        console.log(frida);
        var frtab = createFriendShipTable(frida);
        var frtabd = createFoldDiv(frtab, "Friendship");
        page.append(frtabd);
        l = getElementsByTagInFirst(v, "experiencePoints");
        if (!l.length) return;
        var expL = []
        l2 = getElementsByTagInFirst(v, 'farmingLevel');
        if (!l2.length) return;
        expL.push(l2[0]);
        l2 = getElementsByTagInFirst(v, 'fishingLevel');
        if (!l2.length) return;
        expL.push(l2[0]);
        l2 = getElementsByTagInFirst(v, 'foragingLevel');
        if (!l2.length) return;
        expL.push(l2[0]);
        l2 = getElementsByTagInFirst(v, 'miningLevel');
        if (!l2.length) return;
        expL.push(l2[0]);
        l2 = getElementsByTagInFirst(v, 'combatLevel');
        if (!l2.length) return;
        expL.push(l2[0]);
        l2 = getElementsByTagInFirst(v, 'luckLevel');
        if (!l2.length) return;
        expL.push(l2[0]);
        l2 = getElementsByTagInFirst(v, "professions");
        if (!l2.length) return;
        var expdiv = createExpDiv(l[0], expL, l2[0]);
        var expdivd = createFoldDiv(expdiv, "Experience (Skill)");
        page.append(expdivd);
        if (firstTab) {
            tab.classList.add("selected");
            page.classList.add("display");
            firstTab = false;
        }
        playerTab.append(tab);
        playerContentList.append(page);
        tab.addEventListener('click', () => {
            if (tab.classList.contains("selected")) return;
            tab.classList.add("selected");
            page.classList.add("display");
            var l = playerTab.children;
            for (var i = 0; i < l.length; i++) {
                if (l[i] != tab && l[i].classList.contains("selected")) l[i].classList.remove("selected");
            }
            l = playerContentList.children;
            for (var i = 0; i < l.length; i++) {
                if (l[i] != page && l[i].classList.contains("display")) l[i].classList.remove("display");
            }
        })
    })
    globalEvent = true;
    return true;
}
