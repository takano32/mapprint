/// <reference path="../../node_modules/@types/leaflet/index.d.ts" />
/// <reference path="../../node_modules/@types/geojson/index.d.ts" />
import * as L from 'leaflet';
import * as $ from 'jquery';

import * as geoJson from 'geojson';

export interface Category {
  displayOnLoad?: boolean,
  browsable?: boolean,
  remoteData?: {},
  name: string,
  id?: number,
  color?: string,
  iconUrl?: string
}
export interface IPrintableMap {
  map:L.Map;
  updated:Date;
  addMarker(feature:geoJson.Feature, category:Category): void;
}
export interface Legend {
  color: string;
  name: string;
}

/**
 * extend L.Layer to store category data
 */
export interface MyLayer extends L.Layer {
  category:Category;
}
/**
 * main class of PrintableMap
 */
export default class PrintableMap implements IPrintableMap{
  map:L.Map;   //map object
  updated:Date;  // last updated
  legends: Legend[] = [];  // legends data
  layers: L.GeoJSON;   // layers of markers
  /**
   * constructor
   * @param host host string of application, like codeforjapan.github.io
   * @param divid div id of a map container.
   */
  constructor (public host:string, public divid :string){
    this.map = L.map(divid).setView([41.3921, 2.1705], 13);
    var tileLayer = L.tileLayer(
      tileServerUrl('mono', host ), {
        attribution: tileServerAttribution(host),
        maxZoom: 18
      }
    );
    tileLayer.addTo( this.map );
  }
  /**
   *
   * @param feature Feature object based on GeoJson
   * @param category Category of the feacures
   */
  addMarker(feature:geoJson.Feature, category:Category): void{
    let geojson = L.geoJSON(feature, {
      onEachFeature: function (feature, layer:MyLayer) {
        var field = '名称: '+feature.properties.name+ '<br>'+
        '詳細: '+feature.properties.description;
        layer.category = category;
        layer.bindPopup(field);
      }
    }).addTo(this.map);
    if (!this.legends.some((legend) =>{
      return legend.name == category.name;
    })){
      this.legends.push({name:category.name, color:category.color!});
    }
  }
  /**
   * load Json String based on umap file
   * @param umapJsonData umap style geojson string
   */
  loadUmapJsonData(umapJsonData:string):void{
    var data = JSON.parse(umapJsonData);
    this.layers = L.geoJSON(data.layers);
    data.layers.forEach( (layer) => {
      let category:Category = layer._umap_options
      layer.features.forEach((feature:geoJson.Feature) => {
        this.addMarker(feature, category);
      });
    });
  }
  /**
   * Load file and add markers
   * @param url file path
   */
  loadFile(url:string):void{
    $.ajax(url).then((data, textStatus, jqXHR)=> {
      // データの最終更新日を表示（ローカルでは常に現在時刻となる）
      //var date = DisplayHelper.getNowYMD(new Date(jqXHR.getResponseHeader('date')));
      //console.log(date);
      this.updated = new Date(jqXHR.getResponseHeader('date')!);
      console.log(this.updated);
      //$('#datetime').html(date.toString());
      if (data.contentType == 'text/xml'){
        //loadKMLData(data, map);
      }else{ // it must be json data
        this.loadUmapJsonData(data);
      }
      this.showLegend();
      this.fitBounds();
    }).catch((jqXHR, textStatus, errorThrown) => {
      console.log('error:' + errorThrown);
      throw new Error(errorThrown);
    });
  }
  /**
   * show legends data
   */
  showLegend():void{
    var legend = new L.Control({position: 'bottomright'});
    legend.onAdd = () => {
      var div = L.DomUtil.create('div', 'legend');

      // loop through our density intervals and generate a label with a colored square for each interval
      for (var i = 0; i < this.legends.length; i++) {
        div.innerHTML +=
        '<div class="legend-type">' +
          '<i style="background:' + this.legends[i].color + '"></i><div class=poi-type> ' + this.legends[i].name + '</div></br>' +
        '</div>';
      }
      return div;
    };
    this.map.addControl(legend);
  }
  /**
   * fit bounds to layers
   */
  fitBounds():void {
    this.map.fitBounds(this.layers.getBounds());
  }
}

export function tileServerAttribution(host:string):string{
  return ( host === 'codeforjapan.github.io' ) ?
  "Maptiles by <a href='http://mierune.co.jp/' target='_blank'>MIERUNE</a>, under CC BY. Data by <a href='http://osm.org/copyright' target='_blank'>OpenStreetMap</a> contributors, under ODbL." :
  'Map data © <a href="http://openstreetmap.org/">OpenStreetMap</a>';
}

export function tileServerUrl(mapStyle:string, host:string):string{
  // 地図の色はnormal,grey, mono, bright, blueが選択できる。
  // 印刷時の視認性の高さからカラーはbright、白黒にはgrayを使用する。
  var styleCode;
  if(mapStyle === 'color'){
    styleCode = 'bright';
  } else if(mapStyle === 'mono'){
    styleCode = 'gray';
  } else {
    styleCode = 'normal';
  }
  // MIERUNEMAPのAPIキーはローカル環境では表示されないのでご注意(https://codeforjapan.github.io/以下でのみ表示される）
  // サーバ上の場合のみMIERUNE地図を使う
  return ( host === 'codeforjapan.github.io' ) ?
  'https://tile.cdn.mierune.co.jp/styles/' + styleCode + '/{z}/{x}/{y}.png?key=KNmswjVYR187ACBqbsZc5fEIBM_DC2TXwMST0tVMe4AiYCt274X0VqAy5pf-ebvl8CtjAtBx15r1YyAiXURC' :
  'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
}
