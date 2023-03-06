// MoonRise Engine

const Mnr = (function(){
  
  ////////////////////variables
  let running = false;
  let binders = [];
  let imgList = {dones:0,iter:0,elems:[]};
  let scrollOld = 0;
  let scrollSensitivity = 40;
  let timeAddStatus = null;
  let scrollImgOffset = 500;
  let componentsHTML =[];
  let componentsCount =0;
  let classBinds = [];
  let tagBinds = [];
  let debounceBinds = 20;
  let b = {};
  let bCalls = {};
  let initialBinds = {
    pageLoading: true,
    windowWidth: 0,
    windowHeight: 0,
  };

  let loadRun = [];

  let scrollRun = [];

  let version = '6.3';



  ///////////////////////////////////////////////////methods
  

  ///////////////////////////////////initials
  const init = (options = {}) => {
    if(running){
      return;
    }
    running = true;
    
    e('html').setAttr('mnr-loading',true);

    // set options
    if(options['debounceBindTime'] != null){
     debounceBinds = options['debounceBindTime'];
    }
    if(options['onLoad'] != null){
      Object.values(options['onLoad']).map(value => {
          onLoad(null,value);
      });
    }
    if(options['binds'] != null){
      setBinds(options['binds']);
    }
    setBinds(initialBinds);
    
   
    
    window.addEventListener('scroll',handleScroll);
    window.addEventListener('resize',handleResize);
    window.addEventListener('load',finishLoad);
  };
  const finishLoad = () => {
      // manage media loading
      loadMedia();

      if(b.pageLoading == true){
        console.log('MOONRISE '+version+' running');

        handleScroll();
        handleResize();
       
        bindAll();

        //run functions after finish load once
        runLoads();


        b.pageLoading = false;
        e('html').setAttr('mnr-loading',false);
      }
  };
  const reload = () => {
      b.pageLoading = true;
      e('html').setAttr('mnr-loading',true);

      finishLoad();
  };

  const onLoad = (fn = null,binds = null) => {
    if(binds != null){
      setBinds(binds);
    }
    if(typeof fn === 'function'){
      loadRun.push(fn);
      if(b.pageLoading == false){
        runLoads();
      }
    }  
  };
  const runLoads = () => {
    for (let i = 0; i < loadRun.length; i++) {
      try{
        loadRun[i].call(Mnr);
      }
      catch(error){
        console.warn('error trying to call function in loads '+error);
      }
    }
    loadRun = {};
  };

  const onScroll = (fn) => {
    if(typeof fn === 'function'){
      scrollRun.push(fn);
    }
  };
  const runScroll = () => {
    for (let i = 0; i < scrollRun.length; i++) {
      try{
        scrollRun[i].call(Mnr);
      }
      catch(error){
        console.warn('error trying to call function in scroll runs '+scrollRun[i]+' error: '+error);
      }
    }
  };
    
  

  ///////////////////////////////////performance
  const debounce = (cb, delay = 500) => {
    let timeout;
  
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        cb(...args);
      }, delay);
    }
  };
  

  ///////////////////////////////////binders
  const setBinderTree = () =>{
    let bindEls = e('[mnr-bind]:not([mnr-bind="set"])').elems.map(el=>{ 
                   return {
                    el,
                    list:e(el).getAttr('mnr-bind').replace(/\s/g, ''),
                    binds:[],
                    event:null,
                    type:null,
                   } 
                 });

    bindEls.map(el=>{
       let list = el.list.split(',');
       let def = getDefaultBindData(el.el);
       el.event = def.event;
       el.type = def.type;
       e(el.el).setAttr('mnr-bind','set');
       if(list.length == 1 && list[0].split(':').length == 1){
         el.binds.push({
           attr: def.attr,
           prop: list[0],
         });
         return;
       }
       let pairs = list.map(l=>{
         let pair = l.split(':');
         return {
           attr: (!!pair[0])? ((pair[0] == 'text')? 'innerText': pair[0]) : def.attr,
           prop: (!!pair[1])? pair[1] : null,
         };
       });

       pairs = pairs.filter(p=>{
         if(!!p.attr){
           p.prop = p.prop ?? pairs.filter(p=>p.prop != null)[0]?.prop;
           return true; 
         }
         return false;
           
       });
       
       el.binds = pairs;
    });
    


    assignToBinder(bindEls);
  };
  const assignToBinder = (data) =>{
    data.map(el=>{
       let props = el.binds.map(bi=>{
          pushToBinder({
           el: el.el,
           attrs: [bi.attr],
           event: el.event,
           type: el.type,
           bind: bi.prop,
          });
       });
    });

    Object.keys(b).map(bi=>{
      pushToBinder({
        el: null,
        attrs: null,
        event: null,
        type: null,
        bind: bi,
      });
    });
  }
  const getDefaultBindData = (el) =>{
    let attr = 'innerText';
    let event = null;
    let type = 'text';
    switch(el.nodeName){
       case "INPUT":
         attr = 'value';
         event = 'keyup';
         type = el.type;
         if(!!type == false){
           type = 'text';
         }
         if(type != 'text'){
           event = 'change';
         }
       break;
       case "TEXTAREA":
         attr = 'value';
         event = 'keyup';
       break;
       case "SELECT":
         attr = 'value';
         event = 'change';
         if(e(el).hasAttr('multiple')){
           type = 'multiple';
         }
       break;
       case "IMG":
         attr = 'src';
         event = null;
         type = null;
       break;
    }
    attr = e(el).getAttr('mnr-bind-attr') ?? attr;
    event = e(el).getAttr('mnr-bind-event') ?? event;
    return {attr,event,type};
  };
  const pushToBinder = ({el,attrs,event,type,bind}) =>{
    let elData = {
      el,
      attrs,
      event,
      type,
      binded:false,
    }

    if(Object.prototype.hasOwnProperty.call(binders, bind)){
      if(elData.el){
        let pos = binders[bind].elems.findIndex(obj => obj['el'] === el);
        if(pos == -1){
          binders[bind].elems.push(elData);
        }
        else{
          binders[bind].elems[pos].attrs = [...binders[bind].elems[pos].attrs,...attrs]; 
          binders[bind].elems[pos].attrs = [...new Set(binders[bind].elems[pos].attrs)];
        }
      }
    }
    else{
      if(elData.el){
        binders[bind] = {elems:[elData],bind,calls:[]};
      }
      else{
        binders[bind] = {elems:[],bind,calls:[]};
      }
    }
  }
  const bindAll = () => {
    setBinderTree();

    for (let bind of Object.keys(b) ) {
        if(!Object.prototype.hasOwnProperty.call(binders, bind)) continue;

        binders[bind].elems.map(elem=>{
            let el = elem.el;
            let attrs = elem.attrs;
            let type = elem.type;
            let event = elem.event;
            //element set default values
            if(!!(e(el).getAttr('mnr-bind-set'))){
              
              if(el.nodeName == 'SELECT' && type == 'multiple'){
                let options = e("option[selected]",el).elems;
                let selected = options.map(elm => elm.value);
                b[bind] = selected;
              }
              else{
                attrs.map(a=>{
                  b[bind] = el[a];
                });
              }
            }

            // add events
            // console.log(`currentBind : ${el.nodeName} ${attrs}  ${event} ${bind}`);
            attrs.map(a=>{
              let bindEvent = null;
              if(type == 'multiple' && a == 'value'){
                bindEvent = debounce((ev)=>{
                   let options = e("option:checked",el).elems;
                   let selected = options.map(elm => elm.value);
                   b[bind] = selected;
                },debounceBinds);
              }
              else if(a == 'value'){
                bindEvent = debounce((ev)=>{
                   // console.log(`binded: ${el.nodeName} - ${a}`);
                   b[bind] = el[a];
                },debounceBinds);
              }

              // add event function
              if(event != null && !elem.binded){
                elem.binded = true;
                el.addEventListener(event,bindEvent);
              }
            });
        });  
        Bind(bind);
    }
    
    
    // console.log(b);
    // console.log(binders);
  };
  const Bind = (prop) => {
    let value = b[prop];
    Object.defineProperty(b, prop, {
        set: (newValue) => {
            value = newValue;
            // console.log("set: "+prop+ " "+ newValue);
            // Set elements to new value
            if(Object.prototype.hasOwnProperty.call(binders, prop)){
              for (let elem of binders[prop].elems) {
                for(let a of elem.attrs){
                  // console.log(a);
                  // console.log(elem.el);
                  if(elem.type == 'multiple' && a == 'value'){
                    e("option",elem.el).removeAttr('selected');
                    newValue.forEach(val=>{
                      let opt = e("option[value='"+val+"']",elem.el).elems[0];
                      if(opt){
                       e(opt).setAttr('selected',true);
                       opt.checked = true;
                      }
                    });
                  }
                  else{
                    if(a in elem.el){
                      elem.el[a] = newValue;
                    }
                    else{
                      e(elem.el).setAttr(a,newValue);
                    }
                  }
                }
              }
            }
            
            if(b.pageLoading == false){
              runBindCalls(prop);
            }
        },
        get: () => {
            return value;
        }
    });
    b[prop] = value;
  };
  const setBinds = (bind) => {
      if(typeof bind == 'object'){
        let temps = Object.entries(bind);
        for (let temp of temps) {
          b[temp[0]] = temp[1];
        }
      }
      if(b.pageLoading == false){
        bindAll();
      }
  };

  const onUpdate = (callback,prop) => {
    if(bCalls[prop]){
      bCalls[prop].calls.push(callback);
    }
    else{
      bCalls[prop] = {calls:[callback]};
    }
  };
  const runBindCalls = (prop) => {
    // bCalls store the fn in case the bind was setted after the call
    // if bCall has the prop, then it transfer it to the binder call and erase it
    if(bCalls[prop]?.calls.length > 0 && binders[prop]){
      bCalls[prop].calls.map(c=>{
        binders[prop].calls.push(c);
      });
      bCalls[prop] = null;
    }
    
    if(binders[prop].calls.length > 0){
      let _this = this;
      binders[prop].calls?.map(c=>{
        c?.call(this);
      });
    }
  };
  

  ///////////////////////////////////window handlers
  const handleScroll = () => {
    let change = false;
    let scroll = window.pageYOffset;
    if(scrollOld > scroll+scrollSensitivity){
      change = true;
    }
    else if(scrollOld < scroll-scrollSensitivity){
      change = true;
    }
    if(change || scroll == 0){
      scrollOld = scroll;

      runScroll();
      // console.log("update scroll");
    } 
  };
  const handleResize = () => {
    let width = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
    let height = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
    
    
    b.windowWidth = width;
    b.windowHeight = height;

    e('body').setAttr('mnr-screen-width', width);
    e('body').setAttr('mnr-screen-height', height);

    handleScroll();
  };



  ///////////////////////////////////media handlers
  const loadMedia = () => {
    e('[mnr-src]').elems.forEach(el=>{
      setMedia(el);
    });
  };
  const setMedia = (el) => {
    let errorLoad = (ev)=>{
      console.warn('image skipped: '+el.src);
    };
    if(el.nodeName == 'IMG'){
      el.addEventListener('error',errorLoad);
    }

    e(el).setAttr('mnr-src-loading', e(el).getAttr('mnr-src'));
    e(el).removeAttr('mnr-src');
    
    u.setViewTrigger(el,function(el){
    
       if(el.nodeName == 'IMG'){
         el.src = Mnr.e(el).getAttr('mnr-src-loading');
       }
       else{
         try{
          Mnr.e(el).css({'background-image': `url(${Mnr.e(el).getAttr('mnr-src-loading')})` });
         }
         catch{
           console.warn('background image skipped: '+el.src);
         }
       }
       Mnr.e(el).removeAttr('mnr-src-loading');
     },null,true);

  }
  



  /////////////////////////////////element handler
  const e = (query, rltv = document) => {
    

    return {
      elems: getQuery(query,rltv),
      query: query,
      rltv: rltv,
      e: function(query){
        let rltv = document;
        if(this.hasElems){
          rltv = this.elems[0];
        }
        return e(query,rltv);
      },
      addClass: function(names){
        let classes = names.trim().split(' ');
        this.elems.forEach(el=>{
          classes.forEach(clss=>{
             el.classList.add(clss);
          });
        });
        return this;
      },
      removeClass: function(names){
        let classes = names.trim().split(' ');
        this.elems.forEach(el=>{
          classes.forEach(clss=>{
             el.classList.remove(clss);
          });
        });
        return this;
      },
      toggleClass: function(names){
        let classes = names.trim().split(' ');
        this.elems.forEach(el=>{
          classes.forEach(clss=>{
            el.classList.toggle(clss);
          });
        });
        return this;
      },
      hasClass: function(names, all = true){
        let classes = names.trim().split(' ');
        let match = 0;
        let compare = 0;
        for(let el of this.e){
          for(let clss of classes){
            compare ++;
            if(all){
              if(el.classList.contains(clss)) match ++;
              continue;
            }
            return el.classList.contains(clss);
          }
        }
        return (match == compare);
      },
      css: function(property){
        let styles = [];
        if(property == null || typeof property == 'string'){
          styles = getComputedStyle(this.elems[0]);
          return (property == null)? styles : styles[property];
        }
        else{
          if(typeof property == 'object'){
            this.elems.forEach(el=>{
              Object.keys(property).forEach(style=>{
                el.style[style] = property[style];
              });
            });
          }
        }
     
        return this;
      },
      getAttr: function(attr){
        return this.elems[0].getAttribute(attr);
      },
      setAttr: function(attr,val){
        this.elems.forEach(el=>{
          el.setAttribute(attr, val);
        });
        return this;
      },
      hasAttr: function(names, all = true){
        let attr = names.trim().split(' ');
        let match = 0;
        let compare = 0;
        for(let el of this.elems){
          for(let at of attr){
            compare ++;
            if(all){
              if(el.hasAttribute(at)) match ++;
              continue;
            }
            return el.hasAttribute(at);
          }
        }
        return (match == compare);
      }, 
      removeAttr: function(names){
        let attr = names.trim().split(' ');
        this.elems.forEach(el=>{
          attr.forEach(at=>{
            el.removeAttribute(at);
          });
        });
        return this;
      },
      getHtml: function(){
        return this.elems[0].innerHTML;
      },
      setHtml: function(html,sanitize = true){
        this.elems.forEach(el=>{
          if(sanitize){
            html = u.sanitizeStr(html);
          }
          el.innerHTML = html;
        });
        return this;
      },
      addHtml: function(html,sanitize = true,location='beforeEnd'){
        this.elems.forEach(el=>{
          if(sanitize){
            html = u.sanitizeStr(html);
          }
          el.insertAdjacentHTML(location,html);
        });
        return this;
      },
      getText: function(text,add = false){
        return this.elems[0].innerText;
      },
      setText: function(text){
        this.elems.forEach(el=>{
          el.innerText = text;
        });
        return this;
      },
      getVal: function(){
        if(this.elems[0].nodeName == "INPUT" || 
           this.elems[0].nodeName == "TEXTAREA" || 
           this.elems[0].nodeName == "SELECT"){
          return this.elems[0].value;
        }
        return this.getText();
      },
      setVal: function(value){
        this.elems.forEach(el=>{
          if(el.nodeName == "INPUT" || 
             el.nodeName == "TEXTAREA" || 
             el.nodeName == "SELECT"){
            el.value = value;
          }
          else{
            el.innerText = value;
          }
        });
        return this;
      },
      getSize: function(){
        return this.elems[0].getBoundingClientRect();
      },
      getParent: function(){
        return e(this.elems[0].parentNode);
      },
      getChild: function(query = 0){
        if(typeof(query) === 'number'){
          if(query < 0){
           query = this.elems[0].children.length + query;
           query = (query < 0) ? -1*query : query;
          }
          return e(this.e[0].children[query]);
        }
        return this.e(query);
      },
      getEl: function(num = 0){
         if(num < 0){
           num = this.elems.length + num;
         }
         return this.elems[num];
      },
      hasElems: function(){
        return !!(this.elems.length);
      },
      run: function(fn){
        try{
          let _this = this;
          fn.call(_this);
        }
        catch(error){
          console.warn('error trying to call function for query'+this.rltv+' '+this.query+' error: '+error);
        }

        return this;
      },
      destroy: function(){
        this.elems.forEach(el=>{
         el.remove();
        });
        this.elems = [];
        return this;
      }
    };
  };


  const getQuery = function(query,rltv = document){
       let elem = [];
       if(typeof(query) == 'string'){
         elem = Array.from(rltv.querySelectorAll(query));
       }
       else{
         elem = [query];
       }
       return elem;
  }
  const singleNode = (function () {
    // make an empty node list to inherit from
    let nodelist = document.createDocumentFragment().childNodes;
    // return a function to create object formed as desired
    return function (node) {
        return Object.create(nodelist, {
            '0': {value: node, enumerable: true},
            'length': {value: 1},
            'item': {
                "value": function (i) {
                    return this[+i || 0];
                }, 
                enumerable: true
            }
        }); // return an object pretending to be a NodeList
    };
  }());


  /////////////////////////////////utilities
  const u = (function(){
    return {
       screenToTop: function(offset = 0, behavior='smooth'){
         let offsetPosition = 0 - offset;
         window.scrollTo({
              top: offsetPosition,
              behavior: behavior
         });
       },
       screenTo: function(elem, offset = 0,behavior='smooth'){
         let scroll = window.pageYOffset;
         if(typeof(elem) == 'string'){
           elem = e(elem).elems[0];
         }
         let bodyRect = e('body').elems[0].getBoundingClientRect().top;
         let elementRect = elem.getBoundingClientRect().top;
         let elementPosition = elementRect - bodyRect;
         let offsetPosition = elementPosition - offset;
         window.scrollTo({
              top: offsetPosition,
              behavior: behavior
         });
       },
       replaceAll: function(str, find, replace) {
       
             return str.replace(new RegExp(find, 'g'), replace);
       },
       mapValue: function(X,A,B,C,D,max = false){
             X = parseFloat(X);
             A = parseFloat(A);
             B = parseFloat(B);
             C = parseFloat(C);
             D = parseFloat(D);
             r =  ((X-A)/(B-A));
             y = ( r * (D-C)) + C;
             let res = Math.trunc(y * 100) / 100;
             if(max){
               res = (res > D)? D : res;
               res = (res < C)? C : res;
             }
             return res;
       },
       deepCopy: function(inObject){
           let outObject, value, key;
       
           if (typeof inObject !== "object" || inObject === null) {
             return inObject // Return the value if inObject is not an object
           }
       
           // Create an array or object to hold the values
           outObject = Array.isArray(inObject) ? [] : {};
       
           for (key in inObject) {
             value = inObject[key];
       
             // Recursively (deep) copy for nested objects, including arrays
             outObject[key] = u.deepCopy(value);
           }
       
           return outObject;
       },
       cutText: function (text, max, addDot = false ) {
         if (text.length >= max) {
           text = text.substr(0, max);
           if (addDot == true) {
             text += "...";
           }
         }
         return text;
       },
       isInViewport: function(element,offset = 0) {
           let rect = element.getBoundingClientRect();
           return (
               (rect.top-offset >= 0 && rect.top-offset <= b.windowHeight ) || 
               (rect.bottom-offset <= b.windowHeight && rect.bottom-offset >= 0) ||
               (rect.top-offset <= 0 && rect.bottom-offset >= b.windowHeight && rect.bottom-offset >= 0)
           );
       },
       isInFullViewport: function(element) {
           const rect = element.getBoundingClientRect();
           return (
               rect.top >= 0 &&
               rect.left >= 0 &&
               rect.bottom <= b.windowHeight &&
               rect.right <= b.windowWidth
           );
       },
       isAboveViewport: function(element, offset = 0){
          let simplePos = element.getBoundingClientRect().top-offset;
          return (b.windowHeight >= simplePos);
       },
       isDarkMode: function(){

         return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
       },
       isApple: function(){

         return /Mac|iPod|iPhone|iPad/.test(navigator.platform);
       },
       getUnique: function(arr){

         return arr.filter((i) => arr.indexOf(i) === arr.lastIndexOf(i));
       },
       sanitizeStr: function(str){
         function clean (html) {
           let nodes = html.children;
           for (let node of nodes) {
             removeAttributes(node);
             clean(node);
           }
         }
         function removeAttributes (elem) {
           let atts = elem.attributes;
           for (let {name, value} of atts) {
             if (!isPossiblyDangerous(name, value)) continue;
             elem.removeAttribute(name);
           }
         }
         function removeScripts (html) {
           let scripts = e('script',html).elems;
           for (let script of scripts) {
             script.remove();
           }
         }
         function isPossiblyDangerous (name, value) {
           let val = value.replace(/\s+/g, '').toLowerCase();
           if (['src', 'href', 'xlink:href'].includes(name)) {
             if (val.includes('javascript:') || val.includes('data:text/html')) return true;
           }
           if (name.startsWith('on')) return true;
         }
         
         let html = document.createElement('div');
         e(html).setHtml(str,false);

         // Sanitize it
         removeScripts(html);
         clean(html);

         return html.innerHTML;
       },
       stringToHTML: function(str) {
         let parser = new DOMParser();
         let doc = parser.parseFromString(str, 'text/html');
         console.log(doc);
         return doc.body || document.createElement('body');
       },
       bool: function(val){
          switch(val){
           case '':
             return false;
           break;
           case 'false':
             return false;
           break;
           case '0':
             return false;
           break;
           case 'null':
             return false;
           case 'undefined':
             return false;
           break;
          }
          return !!val;   
       },
       loadBinds: function(){
         bindAll();
         loadMedia();
       },
       setViewTrigger: function(elem, enter,exit,once = false){
          let interFunct = (entries, observer) => {
            entries.forEach(entry => {
              if(entry.isIntersecting) {
                once = (once == null) ? false : once;

                if(once == true){
                  observer.unobserve(entry.target)
                }

                if(enter != null){
                  enter(entry.target);
                }
              }
              else{
                if(exit != null){
                  exit(entry.target);
                }
              }
            });
          };
          let observer = new IntersectionObserver(interFunct);
          observer.observe(elem)

        return this;
      },
       wait: function(fn, t) {
           let queue = [], self, timer;
    
           function schedule(fn, t) {
               timer = setTimeout(function() {
                   timer = null;
                   fn.call();
                   if (queue.length) {
                       let item = queue.shift();
                       schedule(item.fn, item.t);
                   }
               }, t);            
           }
           self = {
               wait: function(fn, t) {
                   // if already queuing things or running a timer, 
                   //   then just add to the queue
                   if (queue.length || timer) {
                       queue.push({fn: fn, t: t});
                   } else {
                       // no queue or timer yet, so schedule the timer
                       schedule(fn, t);
                   }
                   return self;
               },
               cancel: function() {
                   clearTimeout(timer);
                   queue = [];
                   return self;
               }
           };
           return self.wait(fn, t);
       }
    };
  })();
  


  //////////////////////////////////////////////////expose
  return {
    //variables
    b,
    binders,

    //methods
    init,
    reload,
    onLoad,
    onScroll,
    onUpdate,

    debounce,

  
    
    el:null,
    e,
    u,
  }

})();
Object.freeze(Mnr);