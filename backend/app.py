from flask import Flask, jsonify, request  # Certifique-se de que 'request' está importado
import mysql.connector
from datetime import timedelta
from yourapplication import app as application



app = Flask(__name__)

def get_db_connection():
    connection = mysql.connector.connect(
        host='nab-test-2-instance-2-cluster-2-cluster-reader.cixlujhb3ehf.us-east-1.rds.amazonaws.com',
        user='root',
        password='flamengo1234',
        database='short_term_memory'  # Substitua com o nome do seu banco de dados
    )
    return connection

@app.route('/games')
def games():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT Game_ID, Opponent_Team_Acronym, Home_Team_Acronym, Game_date 
        FROM Game_Events 
        WHERE Game_ID >= 3536 
        GROUP BY Game_ID, Opponent_Team_Acronym, Home_Team_Acronym, Game_date 
        ORDER BY Game_date DESC
    """)
    games = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(games)



def format_timedelta(td):
    total_seconds = int(td.total_seconds())
    hours = total_seconds // 3600
    minutes = (total_seconds % 3600) // 60
    seconds = total_seconds % 60
    return f"{hours:02}:{minutes:02}:{seconds:02}"

@app.route('/game_events')
def game_events():
    game_id = request.args.get('gameId')
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT period, clock_time, Home_Team_Name, Home_Team_Score, Opponent_Team_Name, Opponent_Team_Score, 
               Home_Team_Acronym, Opponent_Team_Acronym, Action_Code, Jersey_Number, Nickname, 
               position_court_x, position_court_y
        FROM Game_Events
        WHERE Game_ID = %s AND position_court_x IS NOT NULL AND position_court_y IS NOT NULL
        GROUP BY period, clock_time, Home_Team_Name, Home_Team_Score, Opponent_Team_Name, 
                 Opponent_Team_Score, Home_Team_Acronym, Opponent_Team_Acronym, Action_Code, 
                 Jersey_Number, Nickname, position_court_x, position_court_y
        ORDER BY period ASC, clock_time DESC
    """, (game_id,))
    events = cursor.fetchall()
    cursor.close()
    conn.close()

    for event in events:
        if isinstance(event['clock_time'], timedelta):
            event['clock_time'] = format_timedelta(event['clock_time'])

    return jsonify(events)


@app.route('/game_events_by_time')
def game_events_by_time():
    game_id = request.args.get('gameId')
    period = request.args.get('period')  # Adicionando o parâmetro period
    clock_time = request.args.get('clockTime')  # O formato de clock_time deve corresponder ao banco de dados
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT period, clock_time, Home_Team_Name, Home_Team_Score, Opponent_Team_Name, Opponent_Team_Score, 
               Home_Team_Acronym, Opponent_Team_Acronym, Action_Code, Jersey_Number, Nickname, 
               position_court_x, position_court_y
        FROM Game_Events
        WHERE Game_ID = %s AND clock_time = %s AND period = %s AND position_court_x IS NOT NULL AND position_court_y IS NOT NULL
        GROUP BY period, clock_time, Home_Team_Name, Home_Team_Score, Opponent_Team_Name, 
                 Opponent_Team_Score, Home_Team_Acronym, Opponent_Team_Acronym, Action_Code, 
                 Jersey_Number, Nickname, position_court_x, position_court_y
        ORDER BY period ASC, clock_time DESC
    """, (game_id, clock_time, period))
    events = cursor.fetchall()
    cursor.close()
    conn.close()

    for event in events:
        if isinstance(event['clock_time'], timedelta):
            event['clock_time'] = format_timedelta(event['clock_time'])

    return jsonify(events)

@app.route('/game_events_by_interval')
def game_events_by_interval():
    game_id = request.args.get('gameId')
    period = request.args.get('period')
    start_time = request.args.get('startTime')
    end_time = request.args.get('endTime')
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT period, clock_time, Home_Team_Name, Home_Team_Score, Opponent_Team_Name, Opponent_Team_Score, 
               Home_Team_Acronym, Opponent_Team_Acronym, Action_Code, Jersey_Number, Nickname, 
               position_court_x, position_court_y
        FROM Game_Events
        WHERE Game_ID = %s AND period = %s AND clock_time >= %s AND clock_time < %s 
              AND position_court_x IS NOT NULL AND position_court_y IS NOT NULL
        GROUP BY period, clock_time, Home_Team_Name, Home_Team_Score, Opponent_Team_Name, 
                 Opponent_Team_Score, Home_Team_Acronym, Opponent_Team_Acronym, Action_Code, 
                 Jersey_Number, Nickname, position_court_x, position_court_y
        ORDER BY period ASC, clock_time ASC
    """, (game_id, period, start_time, end_time))
    events = cursor.fetchall()
    cursor.close()
    conn.close()

    for event in events:
        if isinstance(event['clock_time'], timedelta):
            event['clock_time'] = format_timedelta(event['clock_time'])

    return jsonify(events)


@app.route('/home_players')
def home_players():
    game_id = request.args.get('gameId')
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT Nickname, Jersey_Number
        FROM Player_Game_Stats
        WHERE playing_at_home = 1 AND Game_ID = %s
        GROUP BY Nickname, Jersey_Number
    """, (game_id,))
    players = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(players)

@app.route('/opponent_players')
def opponent_players():
    game_id = request.args.get('gameId')
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT Nickname, Jersey_Number
        FROM Player_Game_Stats
        WHERE playing_at_home = 0 AND Game_ID = %s
        GROUP BY Nickname, Jersey_Number
    """, (game_id,))
    players = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(players)

if __name__ == '__main__':
    app.run(debug=True)
