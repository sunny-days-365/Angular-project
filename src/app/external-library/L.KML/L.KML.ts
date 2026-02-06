/*!
	Copyright (c) 2011-2015, Pavel Shramov, Bruno Bergot - MIT licence
*/

import * as LBase from 'leaflet';

// KMLオブジェクトりを読み込む
export function loadLeafletKMLObj(): L_KML {
  //一度呼んでいたら無視する
  if (true === Singleton.getInstance().isLoad) {
    const x = Singleton.getInstance().L_KML;
    if (x) {
      return { ...x };
    }
  }

  // 以下、コードを読み込む
  //  https://github.com/windycom/leaflet-kml

  const L = LBase as any;

  L.KML = L.FeatureGroup.extend({
    initialize: function (kml: any, kmlOptions: any) {
      this._kml = kml;
      this._layers = {};
      this._kmlOptions = kmlOptions;

      if (kml) {
        this.addKML(kml, kmlOptions);
      }
    },

    addKML: function (xml: any, kmlOptions: any) {
      const layers = L.KML.parseKML(xml, kmlOptions);
      if (!layers || !layers.length) return;
      for (let i = 0; i < layers.length; i++) {
        this.fire('addlayer', {
          layer: layers[i],
        });
        this.addLayer(layers[i]);
      }
      this.latLngs = L.KML.getLatLngs(xml);
      this.fire('loaded');
    },

    latLngs: [],
  });

  L.Util.extend(L.KML, {
    parseKML: function (xml: any, kmlOptions: any) {
      const style = this.parseStyles(xml, kmlOptions);
      this.parseStyleMap(xml, style);
      let el = xml.getElementsByTagName('Folder');
      let layers = [],
        l;
      for (let i = 0; i < el.length; i++) {
        if (!this._check_folder(el[i])) {
          continue;
        }
        l = this.parseFolder(el[i], style);
        if (l) {
          layers.push(l);
        }
      }
      el = xml.getElementsByTagName('Placemark');
      for (let j = 0; j < el.length; j++) {
        if (!this._check_folder(el[j])) {
          continue;
        }
        l = this.parsePlacemark(el[j], xml, style);
        if (l) {
          layers.push(l);
        }
      }
      el = xml.getElementsByTagName('GroundOverlay');
      for (let k = 0; k < el.length; k++) {
        l = this.parseGroundOverlay(el[k]);
        if (l) {
          layers.push(l);
        }
      }
      return layers;
    },

    // Return false if e's first parent Folder is not [folder]
    // - returns true if no parent Folders
    _check_folder: function (e: any, folder: any) {
      e = e.parentNode;
      while (e && e.tagName !== 'Folder') {
        e = e.parentNode;
      }
      return !e || e === folder;
    },

    parseStyles: function (xml: any, kmlOptions: any) {
      const styles: any = {};
      const sl = xml.getElementsByTagName('Style');
      for (let i = 0, len = sl.length; i < len; i++) {
        const style = this.parseStyle(sl[i], kmlOptions);
        if (style) {
          const styleName = '#' + style.id;
          styles[styleName] = style;
        }
      }
      return styles;
    },

    parseStyle: function (xml: any, kmlOptions: any) {
      let style: any = {},
        poptions: any = {},
        ioptions: any = {},
        el,
        id;

      const attributes: any = {
        color: true,
        width: true,
        Icon: true,
        href: true,
        hotSpot: true,
      };

      function _parse(xml: any) {
        const options: any = {};
        for (let i = 0; i < xml.childNodes.length; i++) {
          const e = xml.childNodes[i];
          const key = e.tagName;
          if (!attributes[key]) {
            continue;
          }
          if (key === 'hotSpot') {
            for (let j = 0; j < e.attributes.length; j++) {
              options[e.attributes[j].name] = e.attributes[j].nodeValue;
            }
          } else {
            const value =
              e.childNodes && e.childNodes.length
                ? e.childNodes[0].nodeValue
                : null;
            if (!value) {
              continue;
            }
            if (key === 'color') {
              options.opacity = parseInt(value.substring(0, 2), 16) / 255.0;
              options.color =
                '#' +
                value.substring(6, 8) +
                value.substring(4, 6) +
                value.substring(2, 4);
            } else if (key === 'width') {
              options.weight = parseInt(value);
            } else if (key === 'Icon') {
              ioptions = _parse(e) as any;
              if (ioptions.href) {
                options.href = ioptions.href;
              }
            } else if (key === 'href') {
              options.href = value;
            }
          }
        }
        return options;
      }

      el = xml.getElementsByTagName('LineStyle');
      if (el && el[0]) {
        style = _parse(el[0]);
      }
      el = xml.getElementsByTagName('PolyStyle');
      if (el && el[0]) {
        poptions = _parse(el[0]);
      }
      if (poptions.color) {
        style.fillColor = poptions.color;
      }
      if (poptions.opacity) {
        style.fillOpacity = poptions.opacity;
      }
      el = xml.getElementsByTagName('IconStyle');
      if (el && el[0]) {
        ioptions = _parse(el[0]);
      }
      if (ioptions.href) {
        const iconOptions = {
          iconUrl: ioptions.href,
          shadowUrl: null,
          anchorRef: { x: ioptions.x, y: ioptions.y },
          anchorType: { x: ioptions.xunits, y: ioptions.yunits },
        };

        if (
          typeof kmlOptions === 'object' &&
          typeof kmlOptions.iconOptions === 'object'
        ) {
          L.Util.extend(iconOptions, kmlOptions.iconOptions);
        }

        style.icon = new L.KMLIcon(iconOptions);
      }

      id = xml.getAttribute('id');
      if (id && style) {
        style.id = id;
      }

      return style;
    },

    parseStyleMap: function (xml: any, existingStyles: any) {
      const sl = xml.getElementsByTagName('StyleMap');

      for (let i = 0; i < sl.length; i++) {
        var e = sl[i],
          el;
        var smKey, smStyleUrl;

        el = e.getElementsByTagName('key');
        if (el && el[0]) {
          smKey = el[0].textContent;
        }
        el = e.getElementsByTagName('styleUrl');
        if (el && el[0]) {
          smStyleUrl = el[0].textContent;
        }

        if (smKey === 'normal') {
          existingStyles['#' + e.getAttribute('id')] =
            existingStyles[smStyleUrl];
        }
      }

      return;
    },

    parseFolder: function (xml: any, style: any) {
      let el,
        layers = [],
        l;
      el = xml.getElementsByTagName('Folder');
      for (let i = 0; i < el.length; i++) {
        if (!this._check_folder(el[i], xml)) {
          continue;
        }
        l = this.parseFolder(el[i], style);
        if (l) {
          layers.push(l);
        }
      }
      el = xml.getElementsByTagName('Placemark');
      for (let j = 0; j < el.length; j++) {
        if (!this._check_folder(el[j], xml)) {
          continue;
        }
        l = this.parsePlacemark(el[j], xml, style);
        if (l) {
          layers.push(l);
        }
      }
      el = xml.getElementsByTagName('GroundOverlay');
      for (let k = 0; k < el.length; k++) {
        if (!this._check_folder(el[k], xml)) {
          continue;
        }
        l = this.parseGroundOverlay(el[k]);
        if (l) {
          layers.push(l);
        }
      }
      if (!layers.length) {
        return;
      }
      if (layers.length === 1) {
        l = layers[0];
      } else {
        l = new L.FeatureGroup(layers);
      }
      el = xml.getElementsByTagName('name');
      if (el.length && el[0].childNodes.length) {
        l.options.name = el[0].childNodes[0].nodeValue;
      }
      return l;
    },

    parsePlacemark: function (place: any, xml: any, style: any, options: any) {
      let h,
        i,
        j,
        k,
        el,
        il,
        opts = options || {};

      el = place.getElementsByTagName('styleUrl');
      for (i = 0; i < el.length; i++) {
        const url = el[i].childNodes[0].nodeValue;
        for (const a in style[url]) {
          opts[a] = style[url][a];
        }
      }

      il = place.getElementsByTagName('Style')[0];
      if (il) {
        const inlineStyle = this.parseStyle(place);
        if (inlineStyle) {
          for (k in inlineStyle) {
            opts[k] = inlineStyle[k];
          }
        }
      }

      const multi = ['MultiGeometry', 'MultiTrack', 'gx:MultiTrack'];
      for (h in multi) {
        el = place.getElementsByTagName(multi[h]);
        for (i = 0; i < el.length; i++) {
          var layer = this.parsePlacemark(el[i], xml, style, opts);
          if (layer === undefined) continue;
          this.addPlacePopup(place, layer);
          return layer;
        }
      }

      const layers = [];

      const parse = ['LineString', 'Polygon', 'Point', 'Track', 'gx:Track'];
      for (j in parse) {
        const tag = parse[j];
        el = place.getElementsByTagName(tag);
        for (i = 0; i < el.length; i++) {
          const l = this['parse' + tag.replace(/gx:/, '')](el[i], xml, opts);
          if (l) {
            layers.push(l);
          }
        }
      }

      if (!layers.length) {
        return;
      }
      var layer = layers[0];
      if (layers.length > 1) {
        layer = new L.FeatureGroup(layers);
      }

      this.addPlacePopup(place, layer);
      return layer;
    },

    addPlacePopup: function (place: any, layer: any) {
      let el,
        i,
        j,
        name,
        descr = '';
      el = place.getElementsByTagName('name');
      if (el.length && el[0].childNodes.length) {
        name = el[0].childNodes[0].nodeValue;
      }
      el = place.getElementsByTagName('description');
      for (i = 0; i < el.length; i++) {
        for (j = 0; j < el[i].childNodes.length; j++) {
          descr = descr + el[i].childNodes[j].nodeValue;
        }
      }

      if (name) {
        layer.bindPopup('<h2>' + name + '</h2>' + descr, {
          className: 'kml-popup',
        });
      }
    },

    parseCoords: function (xml: any) {
      const el = xml.getElementsByTagName('coordinates');
      return this._read_coords(el[0]);
    },

    parseLineString: function (line: any, xml: any, options: any) {
      const coords = this.parseCoords(line);
      if (!coords.length) {
        return;
      }
      return new L.Polyline(coords, options);
    },

    parseTrack: function (line: any, xml: any, options: any) {
      let el = xml.getElementsByTagName('gx:coord');
      if (el.length === 0) {
        el = xml.getElementsByTagName('coord');
      }
      let coords: any = [];
      for (let j = 0; j < el.length; j++) {
        coords = coords.concat(this._read_gxcoords(el[j]));
      }
      if (!coords.length) {
        return;
      }
      return new L.Polyline(coords, options);
    },

    parsePoint: function (line: any, xml: any, options: any) {
      const el = line.getElementsByTagName('coordinates');
      if (!el.length) {
        return;
      }
      const ll = el[0].childNodes[0].nodeValue.split(',');
      return new L.KMLMarker(new L.LatLng(ll[1], ll[0]), options);
    },

    parsePolygon: function (line: any, xml: any, options: any) {
      let el,
        polys = [],
        inner = [],
        i,
        coords;
      el = line.getElementsByTagName('outerBoundaryIs');
      for (i = 0; i < el.length; i++) {
        coords = this.parseCoords(el[i]);
        if (coords) {
          polys.push(coords);
        }
      }
      el = line.getElementsByTagName('innerBoundaryIs');
      for (i = 0; i < el.length; i++) {
        coords = this.parseCoords(el[i]);
        if (coords) {
          inner.push(coords);
        }
      }
      if (!polys.length) {
        return;
      }
      if (options.fillColor) {
        options.fill = true;
      }
      if (polys.length === 1) {
        return new L.Polygon(polys.concat(inner), options);
      }
      return new L.MultiPolygon(polys, options);
    },

    getLatLngs: function (xml: any) {
      const el = xml.getElementsByTagName('coordinates');
      let coords: any = [];
      for (let j = 0; j < el.length; j++) {
        // text might span many childNodes
        coords = coords.concat(this._read_coords(el[j]));
      }
      return coords;
    },

    _read_coords: function (el: any) {
      let text: any = '',
        coords = [],
        i;
      for (i = 0; i < el.childNodes.length; i++) {
        text = text + el.childNodes[i].nodeValue;
      }
      text = text.split(/[\s\n]+/);
      for (i = 0; i < text.length; i++) {
        const ll = text[i].split(',');
        if (ll.length < 2) {
          continue;
        }
        coords.push(new L.LatLng(ll[1], ll[0]));
      }
      return coords;
    },

    _read_gxcoords: function (el: any) {
      let text = '',
        coords = [];
      text = el.firstChild.nodeValue.split(' ');
      coords.push(new L.LatLng(text[1], text[0]));
      return coords;
    },

    parseGroundOverlay: function (xml: any) {
      const latlonbox = xml.getElementsByTagName('LatLonBox')[0];
      const bounds = new L.LatLngBounds(
        [
          latlonbox.getElementsByTagName('south')[0].childNodes[0].nodeValue,
          latlonbox.getElementsByTagName('west')[0].childNodes[0].nodeValue,
        ],
        [
          latlonbox.getElementsByTagName('north')[0].childNodes[0].nodeValue,
          latlonbox.getElementsByTagName('east')[0].childNodes[0].nodeValue,
        ],
      );
      const attributes: any = { Icon: true, href: true, color: true };
      function _parse(xml: any) {
        let options: any = {},
          ioptions: any = {};
        for (let i = 0; i < xml.childNodes.length; i++) {
          const e = xml.childNodes[i];
          const key = e.tagName;
          if (!attributes[key]) {
            continue;
          }
          const value = e.childNodes[0].nodeValue;
          if (key === 'Icon') {
            ioptions = _parse(e);
            if (ioptions.href) {
              options.href = ioptions.href;
            }
          } else if (key === 'href') {
            options.href = value;
          } else if (key === 'color') {
            options.opacity = parseInt(value.substring(0, 2), 16) / 255.0;
            options.color =
              '#' +
              value.substring(6, 8) +
              value.substring(4, 6) +
              value.substring(2, 4);
          }
        }
        return options;
      }
      let options: any = {};
      options = _parse(xml);
      if (latlonbox.getElementsByTagName('rotation')[0] !== undefined) {
        const rotation =
          latlonbox.getElementsByTagName('rotation')[0].childNodes[0].nodeValue;
        options.rotation = parseFloat(rotation);
      }
      return new L.RotatedImageOverlay(options.href, bounds, {
        opacity: options.opacity,
        angle: options.rotation,
      });
    },
  });

  L.KMLIcon = L.Icon.extend({
    options: {
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    },
    _setIconStyles: function (img: any, name: any) {
      L.Icon.prototype._setIconStyles.apply(this, [img, name]);
    },
    _createImg: function (src: any, el: any) {
      el = el || document.createElement('img');
      el.onload = this.applyCustomStyles.bind(this, el);
      el.src = src;
      return el;
    },
    applyCustomStyles: function (img: any) {
      const options = this.options;
      const width = options.iconSize[0];
      const height = options.iconSize[1];

      this.options.popupAnchor = [0, -0.83 * height];
      if (options.anchorType.x === 'fraction')
        img.style.marginLeft = -options.anchorRef.x * width + 'px';
      if (options.anchorType.y === 'fraction')
        img.style.marginTop = -(1 - options.anchorRef.y) * height + 1 + 'px';
      if (options.anchorType.x === 'pixels')
        img.style.marginLeft = -options.anchorRef.x + 'px';
      if (options.anchorType.y === 'pixels')
        img.style.marginTop = options.anchorRef.y - height + 1 + 'px';
    },
  });

  L.KMLMarker = L.Marker.extend({
    options: {
      icon: new L.KMLIcon.Default(),
    },
  });

  // Inspired by https://github.com/bbecquet/Leaflet.PolylineDecorator/tree/master/src
  L.RotatedImageOverlay = L.ImageOverlay.extend({
    options: {
      angle: 0,
    },
    _reset: function () {
      L.ImageOverlay.prototype._reset.call(this);
      this._rotate();
    },
    _animateZoom: function (e: any) {
      L.ImageOverlay.prototype._animateZoom.call(this, e);
      this._rotate();
    },
    _rotate: function () {
      if (L.DomUtil.TRANSFORM) {
        // use the CSS transform rule if available
        this._image.style[L.DomUtil.TRANSFORM] +=
          ' rotate(' + this.options.angle + 'deg)';
      } else if (L.Browser.ie) {
        // fallback for IE6, IE7, IE8
        const rad = this.options.angle * (Math.PI / 180),
          costheta = Math.cos(rad),
          sintheta = Math.sin(rad);
        this._image.style.filter +=
          " progid:DXImageTransform.Microsoft.Matrix(sizingMethod='auto expand', M11=" +
          costheta +
          ', M12=' +
          -sintheta +
          ', M21=' +
          sintheta +
          ', M22=' +
          costheta +
          ')';
      }
    },
    getBounds: function () {
      return this._bounds;
    },
  });

  // 読み込み済みにする
  Singleton.getInstance().isLoad = true;
  Singleton.getInstance().L_KML = L;

  return { ...L };
}

export interface L_KML {
  KML: any;
  KMLIcon: any;
  RotatedImageOverlay: any;
}

class Singleton {
  private static instance: Singleton;

  private constructor() {
    // Private constructor to prevent instantiation from outside the class
  }

  public static getInstance(): Singleton {
    if (!Singleton.instance) {
      Singleton.instance = new Singleton();
    }
    return Singleton.instance;
  }

  private _isLoad = false;

  public get isLoad() {
    return this._isLoad;
  }

  public set isLoad(data: boolean) {
    this._isLoad = data;
  }

  private _L_KML: L_KML | undefined = undefined;

  public get L_KML() {
    return this._L_KML;
  }

  public set L_KML(data: L_KML | undefined) {
    this._L_KML = data;
  }
}
