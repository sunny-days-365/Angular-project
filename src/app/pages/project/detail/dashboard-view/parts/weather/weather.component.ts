import { Store } from '@ngrx/store';
import { Actions } from '@ngrx/effects';
import { BaseComponent } from '@nikon-trimble-sok/parts-components';

import { ApplicationState } from 'src/app/stores/states/application-wide/app.state';
import { Component } from '@angular/core';
import { NavbarOuterFrameSelector } from 'src/app/stores/selectors/project/navbar-outer-frame.selector';

@Component({
  selector: 'ntc-project-project-dashboard-view-weather-component',
  templateUrl: './weather.component.html',
  styleUrls: ['./weather.component.scss'],
})
export class WeatherComponent extends BaseComponent {
  public isSidebarExpanded: boolean = false;

  constructor(
    private store: Store<ApplicationState>,
    private actions$: Actions,
  ) {
    super('Weather');

    this.addSubscriptionsList(
      this.store
        .select(NavbarOuterFrameSelector.selectorSideBarExpanded)
        .subscribe((sidebarExpanded: boolean) => {
          this.isSidebarExpanded = sidebarExpanded;
        }),
    );
  }

  // eslint-disable-next-line @angular-eslint/use-lifecycle-interface
  ngAfterViewInit() {
    const jquery = document.createElement('script');
    jquery.async = false;
    jquery.src =
      'https://ajax.googleapis.com/ajax/libs/jquery/1.10.2/jquery.min.js';
    const jquerydiv = document.getElementById('jquery');
    jquerydiv?.insertAdjacentElement('afterend', jquery);

    const weather = document.createElement('script');
    weather.async = false;
    weather.src =
      'https://sitecreation.co.jp/wp-content/themes/emanon-premium-child/tpl/weather.js';
    const weatherdiv = document.getElementById('weather');
    weatherdiv?.insertAdjacentElement('afterend', weather);

    const parameter = document.createElement('script');
    parameter.innerText =
      'weather_value=7;lat = 44.061962;lon =143.528046;inputText1 = "北海道紋別郡遠軽町";search_add = "北海道紋別郡遠軽町";';
    const parameterdiv = document.getElementById('parameter');
    parameterdiv?.insertAdjacentElement('afterend', parameter);

    const stylesheet1 = document.createElement('link');
    stylesheet1.rel = 'stylesheet';
    stylesheet1.href =
      'https://cdnjs.cloudflare.com/ajax/libs/weather-icons/2.0.12/css/weather-icons-wind.css';
    const stylesheet1div = document.getElementById('stylesheet1');
    stylesheet1div?.insertAdjacentElement('afterend', stylesheet1);

    const stylesheet2 = document.createElement('link');
    stylesheet2.rel = 'stylesheet';
    stylesheet2.href =
      'https://use.fontawesome.com/releases/v5.6.1/css/all.css';
    const stylesheet2div = document.getElementById('stylesheet2');
    stylesheet2div?.insertAdjacentElement('afterend', stylesheet2);

    const stylesheet3 = document.createElement('link');
    stylesheet3.id = 'PageStyleSheet';
    stylesheet3.rel = 'stylesheet';
    stylesheet3.href =
      'https://sitecreation.co.jp/wp-content/themes/emanon-premium-child/tpl/style.css';
    const stylesheet3div = document.getElementById('stylesheet3');
    stylesheet3div?.insertAdjacentElement('afterend', stylesheet3);

    const style = document.createElement('style');
    style.innerHTML =
      '\
    .max_temp{display:inline-block !important}\
    .min_temp{display:inline-block !important}\
    .temp{display:block !important}\
    .rain_s{display:block !important}\
    .pop-rain{undefined}\
    .speed-wind{undefined}\
    .deg-wind{undefined}\
    .w_snow{undefined}\
    .w_bg{background:linear-gradient(to right,#ffffff, #fff)}';
    const stylediv = document.getElementById('style');
    stylediv?.insertAdjacentElement('afterend', style);
  }
}
