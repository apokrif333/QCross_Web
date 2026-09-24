from geopy.geocoders import Nominatim
from tqdm import tqdm
from colorama import Fore, Style
from branca.colormap import LinearColormap

import os
import folium
import pandas as pd
import numpy as np
import pickle
import plotly.graph_objs as go

pd.options.display.max_rows = 1_010
pd.options.display.max_columns = 500
pd.options.display.width = 1800
pd.options.display.float_format = '{:.8f}'.format


def globalpropertyguide_corrector(some_str: str) -> str:
    return some_str.replace('Kazakstan', 'Kazakhstan')\
        .replace('Slovak Republic', 'Slovakia').replace('Rio De Janeiro', 'Rio de Janeiro').replace(' - Ontario', '')\
        .replace('Montréal-Quebec', 'Montreal').replace('-British Columbia', '').replace('Medellín', 'Medellin')\
        .replace('Bogotá', 'Bogota').replace('San José', 'San Jose').replace('Frankfurt am Main', 'Frankfurt')\
        .replace('Düsseldorf', 'Dusseldorf').replace('Hong Kong Island', 'Hong Kong')\
        .replace('Reykjavík', 'Reykjavik').replace('Mérida', 'Merida').replace('Gdańsk', 'Gdansk') \
        .replace('Kraków', 'Krakow').replace('Poznań', 'Poznan').replace('Łódź', 'Lodz').replace('Constanţa', 'Constanta')\
        .replace('Constanţa', 'Constanta').replace('Košice', 'Kosice').replace('Malmö', 'Malmo')\
        .replace('Canton of Geneva', 'Geneva').replace('Canton of Zurich', 'Zurich')\
        .replace('Taipei City', 'Taipei').replace('Kaohsiung City', 'Kaohsiung').replace('Hsinchu City', 'HsinChu')\
        .replace('Kiev (Kyiv)', 'Kiev').replace('Odessa (Odesa)', 'Odessa')


def prepare_globalpropertyguide(file_name: str) -> dict:
    with open(os.path.join('files', f'{file_name}.pickle'), 'rb') as f:
        gpg_data = pickle.load(f)

    country_yield = {'country': [], 'yield': []}
    cities_yield = {'country': [], 'city': [], 'yield': [], 'text': []}
    for country, data in gpg_data.items():
        country = globalpropertyguide_corrector(country)
        country_median = []
        for city, city_data in data['cities'].items():
            if '(combined)' in city:
                continue

            median_yield = None
            df_neighbors = pd.DataFrame()
            for neigh, df in city_data.items():
                if neigh == 'medianYield':
                    continue

                df['Yield'] = df['monthlyRentUSD'] * 12 / df['PriceUSD']
                df = df[~((df['Yield'] > .25) | (df['Yield'] < .01))].copy()
                median_yield = df['Yield'].median() * 100
                country_median.append(median_yield)

                df['Apartments'] = df['Apartments'].str.replace('Studio', '0-Studio', regex=False)\
                    .str.replace('0-Studio & 1-Bedroom', '0-Studio', regex=False)
                df['PriceUSD'] = df['PriceUSD'].map('${:,.0f}'.format)
                df['monthlyRentUSD'] = df['monthlyRentUSD'].map('${:,.0f}'.format)
                df['Yield'] = (df['Yield']).map('{:,.1%}'.format)
                df['Neighb'] = neigh
                df.columns = ['Apartments', 'Price', 'Rent', 'Yield', 'Neighbor']
                df_neighbors = pd.concat([df_neighbors, df])

            df_neighbors = df_neighbors.groupby(['Neighbor', 'Apartments']).first()
            city = globalpropertyguide_corrector(city)
            cities_yield['country'].append(country)
            cities_yield['city'].append(city)
            cities_yield['yield'].append(median_yield)
            cities_yield['text'].append(df_neighbors)

        country_yield['country'].append(country)
        country_yield['yield'].append(np.median(country_median))

    df_gpg_countries = pd.DataFrame.from_dict(country_yield).sort_values('yield', ascending=False)
    df_gpg_countries.columns = df_gpg_countries.columns.str.capitalize()
    df_gpg_cities = pd.DataFrame.from_dict(cities_yield).sort_values('yield', ascending=False)
    df_gpg_cities.columns = df_gpg_cities.columns.str.capitalize()

    return {'countries': df_gpg_countries, 'cities': df_gpg_cities}


def numbeo_cities_corrector(series: pd.Series) -> pd.Series:
    return series.str.replace('Arhus', 'Aarhus', regex=False).replace('Astana (Nur-Sultan)', 'Astana', regex=False)\
        .replace('Marrakech', 'Marrakesh', regex=False).replace('The Hague (Den Haag)', 'The Hague', regex=False)\
        .replace('Panama City', 'Panama', regex=False).replace('Krakow (Cracow)', 'Krakow', regex=False)\
        .replace('Seville (Sevilla)', 'Seville', regex=False)


def numbeo_countries_corrector(series: pd.Series) -> pd.Series:
    return series.str.replace(' (China)', '', regex=False)\
        .str.replace('Bosnia And Herzegovina', 'Bosnia and Herzegovina', regex=False)\
        .str.replace(' (Disputed Territory)', '', regex=False)


def prepare_numbeo(file: str) -> dict:
    df = pd.read_csv(os.path.join('files', f'{file}.csv'))

    # Подготовим текст для описания каждого города
    text = []
    mean_yield = []
    df.columns = [col.replace('in ', '').replace('Centre', 'Center').replace('bedrooms', 'bedroom') for col in df.columns]
    for idx, row in df.iterrows():
        cur_df = {'Neighbor': [], 'Apartments': [], 'Price': [], 'Rent': [], 'Yield': []}
        for neighbor in ['City Center', 'Outside of Center']:
            for flat in [1, 3]:
                square = 50 if flat == 1 else 110
                price = row[f'Price per Square Meter to Buy Apartment {neighbor}'] * square
                rent = row[f'Apartment ({flat} bedroom) {neighbor}']
                cur_yield = rent * 12 / price

                if (cur_yield < .01) or (cur_yield > .25):
                    continue

                cur_df['Neighbor'].append(neighbor)
                cur_df['Apartments'].append(f'{flat}-Bedroom')
                cur_df['Price'].append(price)
                cur_df['Rent'].append(rent)
                cur_df['Yield'].append(cur_yield)

        cur_df = pd.DataFrame(cur_df).set_index(['Neighbor', 'Apartments'])
        mean_yield.append(cur_df['Yield'].median())
        cur_df['Price'] = cur_df['Price'].map('${:,.0f}'.format)
        cur_df['Rent'] = cur_df['Rent'].map('${:,.0f}'.format)
        cur_df['Yield'] = (cur_df['Yield']).map('{:,.1%}'.format)
        text.append(cur_df)

    df['meanYield'] = mean_yield
    df['meanYield'] *= 100
    df['Text_numbeo'] = text

    # Исправим опечатки в названии городов
    splited_df = df['City'].str.split(',', expand=True, n=1)
    df['City'] = splited_df[0].str.replace('^ ', '', regex=True)
    df['City'] = numbeo_cities_corrector(df['City'])
    df['Country'] = splited_df[1].str.replace(r'^.*,\s', '', regex=True).str.replace('^ ', '', regex=True)
    df['Country'] = numbeo_countries_corrector(df['Country'])

    df_numbeo_countries = df.groupby('Country')['meanYield'].median()
    df_numbeo_countries = pd.DataFrame(df_numbeo_countries).reset_index().sort_values('meanYield', ascending=False)
    df_numbeo_cities = df[['Country', 'City', 'meanYield', 'Text_numbeo']]

    return {'countries': df_numbeo_countries, 'cities': df_numbeo_cities}


def create_countries_map(gpg_dict: dict, numbeo_dict: dict) -> None:
    df_total_counties = pd.merge(gpg_dict['countries'], numbeo_dict['countries'], on='Country', how='outer')
    df_total_counties['finalYield'] = df_total_counties[['Yield', 'meanYield']].mean(axis=1, skipna=True)
    df_total_counties = df_total_counties[df_total_counties['finalYield'] < 21]\
        .sort_values('finalYield', ascending=False)

    # Отрисуем
    fig = go.Figure(data=go.Choropleth(
        locations=df_total_counties['Country'],
        locationmode='country names',
        z=df_total_counties['finalYield'],
        text=[f'{x/100:.1%}' for x in df_total_counties['finalYield']],
        colorscale='blugrn',
        autocolorscale=False,
        reversescale=False,
        marker_line_color='black',
        marker_line_width=0.5,
        colorbar=dict(title='Yield, %', tickprefix='', ticksuffix='%'),
        hovertemplate='<b>%{location}</b><br>Yield: %{text}',
        name=''
    ))

    # задаем layout для карты
    fig.update_layout(
        title_text='Income by Country',
        geo=dict(
            showframe=False,
            showcoastlines=False,
            projection_type='equirectangular'
        ),
        annotations=[dict(
            x=0.55,
            y=0.1,
            xref='paper',
            yref='paper',
            text='Source: World Bank',
            showarrow=False
        )]
    )
    fig.show()

    return None


def check_lat_long(df: pd.DataFrame) -> pd.DataFrame:
    # Подготовим датафрейм
    df.loc[(df['Country'] == 'Albania') & (df['City'] == 'Duress'), 'City'] = 'Durres'
    df.loc[(df['Country'] == 'Albania') & (df['City'] == 'Skhöder'), 'City'] = 'Shkoder'
    df.loc[(df['Country'] == 'Belgium') & (df['City'] == 'Oostend'), 'City'] = 'Ostend'
    df.loc[(df['Country'] == 'Chile') & (df['City'] == 'Conception'), 'City'] = 'Concepcion'
    df.loc[(df['Country'] == 'Malaysia') & (df['City'] == 'Georgetown'), 'City'] = "George Town"
    df.loc[(df['Country'] == 'Malaysia') & (df['City'] == 'Iskander Puteri'), 'City'] = "Iskandar Puteri"
    df.loc[(df['Country'] == 'Malaysia') & (df['City'] == 'Penang'), 'City'] = "Pulau Pinang"
    df.loc[(df['Country'] == 'Malta') & (df['City'] == 'St Julians´s'), 'City'] = "San Ġiljan"
    df.loc[(df['Country'] == 'Malta') & (df['City'] == 'Qawra'), 'City'] = "St. Paul's Bay"
    df.loc[(df['Country'] == 'Slovenia') & (df['City'] == 'Gorenskja'), 'City'] = 'Gorenjska'
    df.loc[(df['Country'] == 'Switzerland') & (df['City'] == 'Canton of Aargau'), 'City'] = 'Aarau'
    df.loc[(df['Country'] == 'Switzerland') & (df['City'] == 'Canton of Fribourg'), 'City'] = 'Fribourg'
    df.loc[(df['Country'] == 'Switzerland') & (df['City'] == 'Canton of Ticino'), 'City'] = 'Bellinzona'
    df.loc[(df['Country'] == 'Switzerland') & (df['City'] == 'Canton of Valais'), 'City'] = 'Valais'
    df.loc[(df['Country'] == 'Switzerland') & (df['City'] == 'Canton of Vaud'), 'City'] = 'Vaud'
    df.loc[(df['Country'] == 'Taiwan') & (df['City'] == 'Tainan City'), 'City'] = 'Tâi-lâm'
    df.loc[(df['Country'] == 'United Arab Emirates') & (df['City'] == 'Raz al Khaimah'), 'City'] = "Ra's al-Khaymah"
    df['CountryCity'] = df['City'] + ', ' + df['Country']
    df.sort_values(['Country', 'City'], inplace=True)

    # Загрузим готовый файл и заполним данные, которых нет в geolocator
    df_prepared = pd.read_csv(os.path.join('files', 'CountryCities.csv'))[['CountryCity', 'latitude', 'longitude']]
    df = pd.merge(df, df_prepared, how='left', on='CountryCity')
    df = df[df['CountryCity'] != 'Iceland, Iceland']
    df.loc[df['CountryCity'] == 'Outlying Islands, Hong Kong', ['latitude', 'longitude']] = [22.17225, 113.900583]
    df.loc[df['CountryCity'] == 'George Town, Malaysia', ['latitude', 'longitude']] = [5.425300, 100.312386]
    df.loc[df['CountryCity'] == 'Ramallah, Palestine', ['latitude', 'longitude']] = [31.898043, 35.204269]
    df.loc[df['CountryCity'] == 'Panama Oeste, Panama', ['latitude', 'longitude']] = [8.814632542, -79.906137853]
    df.loc[df['CountryCity'] == 'Gorenjska, Slovenia', ['latitude', 'longitude']] = [46.23512, 14.34869]
    df.loc[df['CountryCity'] == 'Dolphin Coast, South Africa', ['latitude', 'longitude']] = [-29.437578, 31.222571]
    df.loc[df['CountryCity'] == 'KZN South Coast, South Africa', ['latitude', 'longitude']] = [-30.845867, 30.372374]

    # Добавим недостающих
    df_empty = df[pd.isna(df['latitude'])]
    geolocator = Nominatim(user_agent="my_app_name")
    for idx, city in tqdm(df_empty['CountryCity'].items()):
        location = geolocator.geocode(city, language='en', featuretype='city', timeout=3)
        if location is None:
            print(Fore.RED + f"Для {city} не определены lat и long!" + Style.RESET_ALL)
        else:
            df.loc[idx, 'latitude'] = location.latitude
            df.loc[idx, 'longitude'] = location.longitude
    df.to_csv(os.path.join('files', 'CountryCities.csv'), index=False)

    return df


def chooce_correct_text(df: pd.DataFrame) -> pd.DataFrame:
    neighbors_cnt_gpg, neighbors_cnt_numbeo = [], []
    for idx, row in df.iterrows():
        if row['Text'] is np.nan:
            neighbors_cnt_gpg.append(None)
        else:
            neighbors_cnt_gpg.append(len(row['Text'].index.get_level_values(0).unique()))
        if row['Text_numbeo'] is np.nan:
            neighbors_cnt_numbeo.append(None)
        else:
            neighbors_cnt_numbeo.append(len(row['Text_numbeo'].index.get_level_values(0).unique()))
    df['Neighbors_cnt_gpg'] = neighbors_cnt_gpg
    df['Neighbors_cnt_numbeo'] = neighbors_cnt_numbeo

    df.loc[pd.isna(df['Text']), 'Text'] = df['Text_numbeo']
    df.loc[(df['Neighbors_cnt_gpg'] == 1) & ~pd.isna(df['Neighbors_cnt_numbeo']), 'Text'] = df['Text_numbeo']

    return df


def prepare_total_cities(gpg_dict: dict, numbeo_dict: dict) -> pd.DataFrame:
    df = pd.merge(gpg_dict['cities'], numbeo_dict['cities'], on=['Country', 'City'], how='outer')
    df = check_lat_long(df)
    df['CityYield'] = df[['Yield', 'meanYield']].mean(axis=1)
    df = df[df['CityYield'] <= 25.0]
    df = chooce_correct_text(df)

    return df


def create_cities_map(gpg_dict: dict, numbeo_dict: dict) -> None:
    df = prepare_total_cities(gpg_dict, numbeo_dict)

    # Создатим категории для отображения
    df['CityYield_cat'] = pd.cut(
        df['CityYield'],
        bins=[0, 2, 4, 6, 8, 10, 100],
        labels=['<2%', '2%-4%', '4%-6%', '6%-8%', '8%-10%', '>10%']
    )

    # Создаем карту
    gpg_data = df[~pd.isna(df['Text'])]
    m = folium.Map(location=[0, 0], zoom_start=3, tiles=None)
    folium.raster_layers.TileLayer(tiles='CartoDB positron', name='Арендная доходность').add_to(m)

    layer2 = folium.FeatureGroup(name='<2%')
    layer2_4 = folium.FeatureGroup(name='2%-4%')
    layer4_6 = folium.FeatureGroup(name='4%-6%')
    layer6_8 = folium.FeatureGroup(name='6%-8%')
    layer8_10 = folium.FeatureGroup(name='8%-10%')
    layer10 = folium.FeatureGroup(name='>10%')
    colormap = LinearColormap(colors=['blue', 'red'], vmin=0, vmax=10)
    colormap = colormap.to_step(index=[0, 2, 4, 6, 8, 10])
    for idx, row in gpg_data.iterrows():
        location = (row['latitude'], row['longitude'])
        radius = 8
        cur_text = row["Text"].to_html(
            justify="left", col_space=65, border=1, bold_rows=False, index_names=True, sparsify=True
        )
        cur_text = cur_text.replace(
            """    </tr>
    <tr>
      <td rowspan=""",
            "</tr><tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr><tr><td rowspan="
        )
        popup_html = f'<h4>{row["CountryCity"]}</h4>{cur_text}'

        child = folium.CircleMarker(
            location=location, radius=radius, fill=True, popup=popup_html, fill_color=colormap(row['CityYield']),
            fill_opacity=1, weight=0, color=None
        )
        if row['CityYield_cat'] == '<2%':
            layer2.add_child(child)
        elif row['CityYield_cat'] == '2%-4%':
            layer2_4.add_child(child)
        elif row['CityYield_cat'] == '4%-6%':
            layer4_6.add_child(child)
        elif row['CityYield_cat'] == '6%-8%':
            layer6_8.add_child(child)
        elif row['CityYield_cat'] == '8%-10%':
            layer8_10.add_child(child)
        elif row['CityYield_cat'] == '>10%':
            layer10.add_child(child)

    m.add_child(layer2)
    m.add_child(layer2_4)
    m.add_child(layer4_6)
    m.add_child(layer6_8)
    m.add_child(layer8_10)
    m.add_child(layer10)
    folium.LayerControl().add_to(m)

    colormap.caption = 'Арендная доходность'
    colormap.width = 300
    m.add_child(colormap)

    m.save('map.html')

    return None


if __name__ == "__main__":
    # gpg_dict = prepare_globalpropertyguide(f'globalpropertyguide')
    # numbeo_dict = prepare_numbeo(f'numbeo')

    # Make table
    gpg_dict = prepare_globalpropertyguide(f'globalpropertyguide')
    numbeo_dict = prepare_numbeo(f'numbeo')
