from dash import Dash, dcc, html, dash_table
from dash.dependencies import Input, Output
from pathlib import Path

import pandas as pd
import numpy as np


def prepare_df_for_table() -> pd.DataFrame:
    source = Path(__file__).parent / 'files' / 'numbeo_cities.csv'
    if not source.exists():
        from numbeo import prepare_exports

        prepare_exports(Path(__file__).parent / 'files' / 'numbeo.csv')
    prepared = pd.read_csv(source)
    prepared['Apartments'] = prepared['Bedrooms'].astype(str) + '-Bedroom'
    prepared.rename(columns={
        'Area': 'Neighbor',
        'EstimatedPurchasePriceUSD': 'Price',
        'MonthlyRentUSD': 'Rent',
        'GrossRentalYieldPct': 'Yield_n',
    }, inplace=True)
    prepared['Price'] = prepared['Price'].round().astype(int)
    prepared['Rent'] = prepared['Rent'].round().astype(int)
    prepared['Yield_n'] = (prepared['Yield_n'] / 100).round(4)
    return prepared[['Country', 'City', 'Neighbor', 'Apartments', 'Price', 'Rent', 'Yield_n']]

    # Создадим таблицу со всеми районами
def str_to_fin(num: float) -> str:
    if num >= 10**6:
        return '${:.1f}M'.format(num / 10**6)
    elif num >= 10**4:
        return '${:.0f}k'.format(num / 10**3)
    elif num >= 10**3:
        return '${:.1f}k'.format(num / 10**3)
    else:
        return '${:.0f}'.format(num)


df = prepare_df_for_table()
app = Dash(__name__)
server = app.server

# Определение стилей таблицы
table_style = {
    'overflowY': 'scroll',
    'maxHeight': '500px',
    'width': '100%'
}

money = dash_table.FormatTemplate.money(0)
percentage = dash_table.FormatTemplate.percentage(1)
columns_format = [
    dict(id='Country', name='Country'),
    dict(id='City', name='City'),
    dict(id='Neighbor', name='Area'),
    dict(id='Apartments', name='Apartments'),
    dict(id='Price', name='Price', type='numeric', format=money),
    dict(id='Rent', name='Rent', type='numeric', format=money),
    dict(id='Yield_n', name='Yield', type='numeric', format=percentage)
]

# Определение элементов управления фильтрации
country_options = [{'label': country, 'value': country} for country in np.sort(df['Country'].unique())]
city_options = [{'label': city, 'value': city} for city in np.sort(df['City'].unique())]
apart_options = [{'label': apartments, 'value': apartments} for apartments in np.sort(df['Apartments'].unique())]
price_marks = [df['Price'].min(), 50_000, 200_000, 500_000, 2_000_000, df['Price'].max()]
rent_marks = [df['Rent'].min(), 150, 500, 2_000, 9_500, df['Rent'].max()]

maps_dir = Path(__file__).parent / 'maps'
country_map_path = maps_dir / 'countries_rental_yield.html'
city_map_path = maps_dir / 'cities_rental_yield.html'
if not country_map_path.exists() or not city_map_path.exists():
    from maps import build_maps

    build_maps()
country_map_html = country_map_path.read_text(encoding='utf-8')
city_map_html = city_map_path.read_text(encoding='utf-8')

# Определение макета веб-приложения
app.layout = html.Div([
    html.H1('Мировая недвижимость: стоимость, аренда и доходность'),
    dcc.Tabs([
        dcc.Tab(
            label='Доходность по странам',
            children=html.Iframe(
                srcDoc=country_map_html,
                style={'width': '100%', 'height': '720px', 'border': '0'},
            ),
        ),
        dcc.Tab(
            label='Объекты по городам',
            children=html.Iframe(
                srcDoc=city_map_html,
                style={'width': '100%', 'height': '720px', 'border': '0'},
            ),
        ),
    ]),
    html.H2('Таблица объектов'),
    html.Label('Country'),
    dcc.Dropdown(
        id='country-dropdown',
        options=country_options,
        value=None,
        multi=True
    ),
    html.Label('City'),
    dcc.Dropdown(
        id='city-dropdown',
        options=city_options,
        value=None,
        multi=True
    ),
    html.Label('Apartments'),
    dcc.Dropdown(
        id='apartments-dropdown',
        options=apart_options,
        value=None,
        multi=True
    ),
    html.Label('Price Range'),
    dcc.RangeSlider(
        id='price-slider',
        min=np.log10(df['Price'].min()),
        max=np.log10(df['Price'].max()),
        dots=False,
        value=[np.log10(df['Price'].min()), np.log10(df['Price'].max())],
        marks={str(np.log10(v)): {'label': str_to_fin(v), 'style': {}} for v in price_marks},
    ),
    html.Div(id='price-slider-output', style={'font-size': '14px', 'font-style': 'italic'}),
    html.Label('Rent Range'),
    dcc.RangeSlider(
        id='rent-slider',
        min=np.log10(df['Rent'].min()),
        max=np.log10(df['Rent'].max()),
        dots=False,
        value=[np.log10(df['Rent'].min()), np.log10(df['Rent'].max())],
        marks={str(np.log10(v)): str_to_fin(v) for v in rent_marks},
        className='ble-slider'
    ),
    html.Div(id='rent-slider-output', style={'font-size': '14px', 'font-style': 'italic'}),
    html.Label('Yield Range'),
    dcc.RangeSlider(
        id='yield-slider',
        min=df['Yield_n'].min(),
        max=np.ceil(df['Yield_n'].max() * 100) / 100,
        step=0.01,
        value=[df['Yield_n'].min(), df['Yield_n'].max()],
        marks={
            str(rental): '{:,.0%}'.format(rental)
            for rental in np.arange(0.02, df['Yield_n'].max() + 0.02, 0.02).round(3)
        },
    ),
    dash_table.DataTable(
        id='table',
        columns=columns_format,
        data=df.to_dict('records'),
        style_table=table_style,
        style_cell={'textAlign': 'center'},
        page_size=50,
        sort_action='native',
        style_header={'backgroundColor': 'rgb(62, 117, 122)', 'color': 'white'},
        style_data={'backgroundColor': 'rgb(240, 247, 248)', 'color': 'black'},
    )
])


# Определение обработчиков событий для фильтров
@app.callback(
    Output('table', 'data'),
    Input('country-dropdown', 'value'),
    Input('city-dropdown', 'value'),
    Input('apartments-dropdown', 'value'),
    Input('price-slider', 'value'),
    Input('rent-slider', 'value'),
    Input('yield-slider', 'value')
)
def update_table(country, city, apartments, price, rent, yield_range):
    price = [10 ** val for val in price]
    rent = [10 ** val for val in rent]
    filtered_df = df[
        (df['Country'].isin(country) if country else True) &
        (df['City'].isin(city) if city else True) &
        (df['Apartments'].isin(apartments) if apartments else True) &
        (df['Price'].between(price[0], price[1])) &
        (df['Rent'].between(rent[0], rent[1])) &
        (df['Yield_n'].between(yield_range[0], yield_range[1]))
        ]
    return filtered_df.to_dict('records')


@app.callback(
    Output('price-slider-output', 'children'),
    Input('price-slider', 'value'))
def update_output(values):
    slider_value = [10 ** val for val in values]
    return f'Min price: ${slider_value[0]:,.0f}, Max price: ${slider_value[1]:,.0f}'


@app.callback(
    Output('rent-slider-output', 'children'),
    Input('rent-slider', 'value'))
def update_output(values):
    slider_value = [10 ** val for val in values]
    return f'Min rent: ${slider_value[0]:,.0f}, Max rent: ${slider_value[1]:,.0f}'


if __name__ == '__main__':
    app.run(debug=True)
